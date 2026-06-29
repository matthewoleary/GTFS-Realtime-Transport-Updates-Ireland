import { extname, join } from 'path';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import { parse } from 'csv-parse';
import stripBomStream from 'strip-bom-stream';
import { dir } from 'tmp-promise';
import untildify from 'untildify';
import Promise from 'bluebird';

import modelsDefault from '../models/models.js';
import { unzip } from './utils/file-utils.js';
import { calculateHourTimestamp, pluralize } from './utils/utils.js';
import { addFeedInfoLastUpdatedColumn, updateFeedInfoLastUpdatedValues, addCustomTimestampColumns } from '../queries/custom-queries.js';

/**
 * MysqlImporter class for importing GTFS data into MySQL.
 */
class MysqlImporter {
    constructor(config, logger, dbClient, cacheClient, models = modelsDefault) {
        this.config = config;
        this.logger = logger;
        this.models = models;
        this.db = dbClient;
        this.cache = cacheClient;
        this.cnx = null;
        // List of models used including those with additional modifications made, e.g. custom timestamp columns
        this.customModels = [];
    }

    async connectDb() {
        // Connect to the MySQL database using the database client
        this.cnx = await this.db.getConnection();
        this.getLastDbUpdate = this.db.getLastDbUpdate;
    }

    /**
     * Download GTFS zip file for the agency.
     */
    async downloadFiles(task) {
        task.log(`Downloading GTFS from ${task.agency_url}`);
        task.path = `${task.downloadDir}/${task.agency_key}-gtfs.zip`;
        const response = await fetch(task.agency_url, { method: 'GET', headers: task.agency_headers || {} });
        if (response.status !== 200) {
            throw new Error('Couldn’t download files');
        }
        const buffer = await response.arrayBuffer();
        await fs.writeFile(task.path, Buffer.from(buffer));
        task.log('Download successful');
    }

    /**
     * Get the last modified date of the GTFS file from the server.
     */
    async getFilesLastModifiedDate(task) {
        task.log(`Checking last modified date of GTFS schedule for ${task.agency_url}`);
        task.path = `${task.downloadDir}/${task.agency_key}-gtfs.zip`;
        const response = await fetch(task.agency_url, { method: 'HEAD', headers: task.agency_headers || {} });
        if (response.status !== 200) {
            this.logger.error('Errors code: ' + response.status + ' Couldn’t get file headers for last modified date for agency: ' + task.agency_key);
            return null;
        }
        const lastModified = response.headers.get('last-modified');
        if (lastModified) {
            return new Date(lastModified);
        }
        return null;
    }

    /**
     * Get all .txt files in a folder.
     */
    async getTextFiles(folderPath) {
        const files = await fs.readdir(folderPath);
        return files.filter(filename => filename.slice(-3) === 'txt');
    }

    /**
     * Unzip and prepare GTFS files for import.
     */
    async readFiles(task) {
        const gtfsPath = untildify(task.path);
        task.log(`Importing GTFS from ${task.path}\r`);
        if (extname(gtfsPath) === '.zip') {
            try {
                await unzip(gtfsPath, task.downloadDir);
                const textFiles = await this.getTextFiles(task.downloadDir);
                // If no .txt files in this directory, check for subdirectories and copy them here
                if (textFiles.length === 0) {
                    const files = await fs.readdir(task.downloadDir);
                    const folders = files.map(filename => join(task.downloadDir, filename)).filter(source => fs.lstatSync(source).isDirectory());
                    if (folders.length > 1) {
                        throw new Error(`More than one subfolder found in zip file at ${task.path}. Ensure that .txt files are in the top level of the zip file, or in a single subdirectory.`);
                    } else if (folders.length === 0) {
                        throw new Error(`No .txt files found in ${task.path}. Ensure that .txt files are in the top level of the zip file, or in a single subdirectory.`);
                    }
                    const subfolderName = folders[0];
                    const directoryTextFiles = await this.getTextFiles(subfolderName);
                    if (directoryTextFiles.length === 0) {
                        throw new Error(`No .txt files found in ${task.path}. Ensure that .txt files are in the top level of the zip file, or in a single subdirectory.`);
                    }
                    await Promise.all(directoryTextFiles.map(async fileName => fs.rename(join(subfolderName, fileName), join(task.downloadDir, fileName))));
                }
            } catch (error) {
                task.error(error);
                console.error(error);
                throw new Error(`Unable to unzip file ${task.path}`);
            }
        } else {
            // Local file is unzipped, just copy it from there.
            await fs.copy(gtfsPath, task.downloadDir);
        }
    }

    /**
     * Create an empty table for a single GTFS model, optionally restricting columns to those in allowedColumnsMap.
     * @param {Object} model - The model object with filenameBase and schema (filtered as needed).
     * @returns {Promise<void>}
     */
    async createEmptyTable(model) {
        if (!model.schema || model.schema.length === 0) return;
        // Collect primary key columns first
        const primaryKeys = model.schema.filter(column => column.primary).map(column => column.name);
        const columns = model.schema.map(column => {
            let check = '';
            if (column.min !== undefined && column.max !== undefined) {
                check = `CHECK( ${column.name} >= ${column.min} AND ${column.name} <= ${column.max} )`;
            } else if (column.min !== undefined) {
                check = `CHECK( ${column.name} >= ${column.min} )`;
            } else if (column.max !== undefined) {
                check = `CHECK( ${column.name} <= ${column.max} )`;
            }
            const identity = column.identity ? 'AUTO_INCREMENT' : '';
            const required = column.required ? 'NOT NULL' : '';
            const columnDefault = column.default ? 'DEFAULT ' + column.default : '';
            return `${column.name} ${column.type} ${identity} ${required} ${check} ${columnDefault}`;
        }).join(', ');
        // Define the composite primary key clause
        const primaryKeyClause = primaryKeys.length > 0 ? `, PRIMARY KEY (${primaryKeys.join(', ')})` : '';
        await this.cnx.query(`CREATE TABLE ${model.filenameBase} (${columns}${primaryKeyClause});`);
    }

    /**
     * Drop all GTFS tables.
     */
    async dropAllTables() {
        // Disable foreign key checks to allow dropping tables in any order
        await this.cnx.query('SET FOREIGN_KEY_CHECKS = 0;');

        // Dropping tables sequentially to prevent potential deadlock of concurrent drops using mapAll.
        await Promise.mapSeries(this.models, async model => {
            if (!model.schema) return;
            await this.cnx.query(`DROP TABLE IF EXISTS ${model.filenameBase};`);
        });

        // Re-enable foreign key checks
        await this.cnx.query('SET FOREIGN_KEY_CHECKS = 1;');
    }

    /**
     * Truncate all GTFS tables.
     */
    async truncateAllTables() {
        // Disable foreign key checks to allow truncating tables with foreign keys
        await this.cnx.query('SET FOREIGN_KEY_CHECKS = 0;');
        await Promise.all(this.customModels.map(async model => {
            if (!model.schema) return;
            await this.cnx.query(`TRUNCATE TABLE ${model.filenameBase};`);
        }));
        // Re-enable foreign key checks
        await this.cnx.query('SET FOREIGN_KEY_CHECKS = 1;');
    }

    async createIndexesForAllTables() {
        // Iterate over the custom models to include any with added columns
        this.logger.info('Creating indexes for all GTFS tables.');
        await Promise.all(this.customModels.map(async model => {
            if (!model.schema) return;
            // Single-column indexes
            await Promise.all(model.schema.map(async column => {
                if (column.index) {
                    // Check if index already exists
                    const [rows] = await this.cnx.query(`
                        SELECT COUNT(*) AS count 
                        FROM information_schema.statistics 
                        WHERE table_schema = DATABASE() 
                            AND table_name = ? 
                            AND index_name = ?
                    `, [model.filenameBase, `idx_${model.filenameBase}_${column.name}`]);
                    if (rows[0].count > 0) {
                        await this.cnx.query(`DROP INDEX idx_${model.filenameBase}_${column.name} ON ${model.filenameBase}`);
                    }
                    const unique = column.index === 'unique' ? 'UNIQUE' : '';
                    await this.cnx.query(`CREATE ${unique} INDEX idx_${model.filenameBase}_${column.name} ON ${model.filenameBase} (${column.name})`);
                }
            }));

            // Composite indexes
            if (Array.isArray(model.indexes)) {
                for (const idx of model.indexes) {
                    const indexName = `idx_${model.filenameBase}_${idx.fields.join('_')}`;
                    const fieldsList = idx.fields.join(', ');
                    const unique = idx.unique ? 'UNIQUE' : '';
                    // Check if composite index already exists
                    const [rows] = await this.cnx.query(`
                        SELECT COUNT(*) AS count
                        FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                            AND table_name = ?
                            AND index_name = ?
                    `, [model.filenameBase, indexName]);
                    if (rows[0].count > 0) {
                        await this.cnx.query(`DROP INDEX ${indexName} ON ${model.filenameBase}`);
                    }
                    await this.cnx.query(`CREATE ${unique} INDEX ${indexName} ON ${model.filenameBase} (${fieldsList})`);
                }
            }
        }));
    }

    /**
     * Add foreign key constraints to GTFS tables.
     */
    async addForeignKeys() {
        this.logger.info('Adding foreign keys');
        // Iterate over the custom models to include any with added columns
        for (const model of this.customModels) {
            if (!model.schema) continue;
            for (const column of model.schema) {
                if (column.foreign_key) {
                    const constraintName = `fk_${model.filenameBase}_${column.name}`;
                    // Check if foreign key constraint already exists
                    const [rows] = await this.cnx.query(`
                        SELECT COUNT(*) AS count 
                        FROM information_schema.TABLE_CONSTRAINTS 
                        WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
                        AND TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = ?
                        AND CONSTRAINT_NAME = ?
                    `, [model.filenameBase, constraintName]);
                    if (rows[0].count === 0) {
                        // Add foreign key constraint
                        await this.cnx.query(`
                            ALTER TABLE ${model.filenameBase}
                            ADD CONSTRAINT ${constraintName}
                            FOREIGN KEY (${column.name})
                            REFERENCES ${column.foreign_key.table}(${column.foreign_key.column})
                            ON DELETE CASCADE
                        `);
                    }
                }
            }
        }
    }

    /**
     * Add unique constraints to GTFS tables.
     */
    async addUniqueConstraints() {
        this.logger.info('Adding unique constraints.');
        // Iterate over the custom models to include any with added columns
        for (const model of this.customModels) {
            if (!model.schema) continue;
            for (const column of model.schema) {
                if (column.unique) {
                    const indexName = `idx_unique_${model.filenameBase}_${column.name}`;
                    // Check if unique index already exists
                    const [rows] = await this.cnx.query(`
                        SELECT COUNT(*) AS count 
                        FROM information_schema.statistics 
                        WHERE table_schema = DATABASE()
                        AND table_name = ?
                        AND index_name = ?
                        AND non_unique = 0
                    `, [model.filenameBase, indexName]);
                    if (rows[0].count === 0) {
                        await this.cnx.query(`
                            CREATE UNIQUE INDEX ${indexName} 
                            ON ${model.filenameBase} (${column.name})
                        `);
                    }
                }
            }
        }
    }

    /**
     * Format a line of GTFS data for import, with validation and conversion.
     */
    formatLine(line, model, totalLineCount) {
        const lineNumber = totalLineCount + 1;
        for (const fieldName of Object.keys(line)) {
            const columnSchema = model.schema.find(schema => schema.name === fieldName);
            // Remove columns not part of model
            if (!columnSchema) {
                delete line[fieldName];
                continue;
            }
            // Remove null values
            if (line[fieldName] === null || line[fieldName] === '') {
                delete line[fieldName];
            }
            // Convert fields that should be integer
            if (columnSchema.type === 'integer') {
                const value = Number.parseInt(line[fieldName], 10);
                if (Number.isNaN(value)) {
                    delete line[fieldName];
                } else {
                    line[fieldName] = value;
                }
            }
            // Convert fields that should be float
            if (columnSchema.type === 'real') {
                const value = Number.parseFloat(line[fieldName]);
                if (Number.isNaN(value)) {
                    delete line[fieldName];
                } else {
                    line[fieldName] = value;
                }
            }
            // Validate required
            if (columnSchema.required === true) {
                if (line[fieldName] === undefined || line[fieldName] === '') {
                    throw new Error(`Missing required value in ${model.filenameBase}.txt for ${fieldName} on line ${lineNumber}.`);
                }
            }
            // Validate minimum
            if (columnSchema.min !== undefined) {
                if (line[fieldName] < columnSchema.min) {
                    throw new Error(`Invalid value in ${model.filenameBase}.txt for ${fieldName} on line ${lineNumber}: below minimum value of ${columnSchema.min}.`);
                }
            }
            // Validate maximum
            if (columnSchema.max !== undefined) {
                if (line[fieldName] > columnSchema.max) {
                    throw new Error(`Invalid value in ${model.filenameBase}.txt for ${fieldName} on line ${lineNumber}: above maximum value of ${columnSchema.max}.`);
                }
            }
        }
        if (model.filenameBase === 'stop_times') {
            // Convert to midnight timestamp
            const timestampFormat = [
                'arrival_time',
                'departure_time'
            ];
            for (const fieldName of timestampFormat) {
                if (line[fieldName]) {
                    line[`${fieldName}stamp`] = calculateHourTimestamp(line[fieldName]);
                }
            }
        }
        return line;
    }

    /**
     * Import lines of GTFS data into the database.
     */
    async importLines(task, lines, model, totalLineCount) {
        if (lines.length === 0) return;
        const linesToImportCount = lines.length;
        const values = [];
        const fieldNames = model.schema.map(column => column.name);
        let value = '';
        while (lines.length) {
            const line = lines.pop();
            const valueList = [];
            for (let i = 0; i < fieldNames.length; i++) {
                const fieldName = fieldNames[i];
                // If column is not an identity column, and value of line[fieldName] is undefined, insert null
                if (!(model.schema[i].identity)) {
                    if (line[fieldName] != null) {
                        // Replace single quotes within strings with double single quotes to prevent sql error
                        value = line[fieldName].toString();
                        value = value.replaceAll("'", "''");
                        valueList.push("'" + value + "'");
                    } else {
                        valueList.push('NULL');
                    }
                    if (!fieldNames.includes(fieldName)) {
                        fieldNames.push(fieldName);
                    }
                }
            }
            values.push(valueList);
        }
        const formattedValues = [];
        for (const value of values) {
            const formattedValue = '(' + value.join(', ') + ')';
            formattedValues.push(formattedValue);
        }
        try {
            await task.cnx.query(`INSERT INTO ${model.filenameBase}(${fieldNames.join(', ')}) VALUES ${formattedValues.join(',')};`);
        } catch (error) {
            task.warn(`Check ${model.filenameBase}.txt for invalid data between lines ${totalLineCount - linesToImportCount} and ${totalLineCount}.`);
            throw error;
        }
        // Passing overwrite as true to ensure progress updates overwrite previous line
        task.log(`Importing - ${model.filenameBase}.txt - ${totalLineCount} lines imported`, true);
    }

    /**
     * Import all GTFS files for the agency.
     */
    async importFiles(task) {
        // Loop through each GTFS file
        return Promise.mapSeries(this.models, async model => {
            // Filter out excluded files from config
            if (task.exclude && task.exclude.includes(model.filenameBase)) {
                task.log(`Skipping - ${model.filenameBase}.txt\r`);
                return;
            }
            const filepath = join(task.downloadDir, `${model.filenameBase}.txt`);
            if (!fs.existsSync(filepath)) {
                if (!model.nonstandard) {
                    task.log(`Importing - ${model.filenameBase}.txt - No file found\r`);
                }
                return;
            }
            // Read header line to get columns
            const fileStream = fs.createReadStream(filepath);
            const headerLine = await new Promise((resolve, reject) => {
                let header = '';
                fileStream.on('data', chunk => {
                    header += chunk.toString();
                    const idx = header.indexOf('\n');
                    if (idx !== -1) {
                        fileStream.destroy();
                        resolve(header.slice(0, idx).replace(/\r$/, ''));
                    }
                });
                fileStream.on('error', reject);
                fileStream.on('close', () => {
                    if (header.length > 0) resolve(header.replace(/\r$/, ''));
                });
            });
            const fileColumns = headerLine.split(',').map(h => h.trim());
            // Create table with only columns present in both schema and file header
            this.customModel = {
                ...model,
                // Always ensure filenameBase is present
                filenameBase: model.filenameBase,
                schema: model.schema.filter(column => fileColumns.includes(column.name)),
            };
            // If no columns from schema are present in file, skip import for this file
            if (!this.customModel.schema || this.customModel.schema.length === 0) {
                task.log(`Skipping - ${model.filenameBase}.txt - No matching columns in file header`);
                return;
            }
            // First create empty table
            await this.createEmptyTable(this.customModel);
            // Adding custom timestamp columns if stop_times.txt
            if (this.customModel.filenameBase === 'stop_times') {
                await addCustomTimestampColumns(task, this.customModel);
            }
            // Add the modified or unmodified model to the list of custom models
            this.customModels.push(this.customModel);
            // Now read and import the file line by line
            task.log(`Importing - ${model.filenameBase}.txt\r`);
            const lines = [];
            let totalLineCount = 0;
            const maxInsertVariables = 20000;
            const parser = parse({
                columns: true,
                relax: true,
                trim: true,
                skip_empty_lines: true,
                ...task.csvOptions
            });
            await new Promise((resolve, reject) => {
                const source = fs.createReadStream(filepath).on('error', reject);
                const pipeline = source.pipe(stripBomStream()).pipe(parser);
                (async () => {
                    try {
                        for await (const record of parser) {
                            totalLineCount += 1;
                            lines.push(this.formatLine(record, this.customModel, totalLineCount));
                            if (lines.length >= maxInsertVariables / this.customModel.schema.length) {
                                await this.importLines(task, lines, this.customModel, totalLineCount);
                            }
                        }
                        await this.importLines(task, lines, this.customModel, totalLineCount);
                        resolve();
                    } catch (err) {
                        parser.destroy();
                        reject(err);
                    }
                })();
            });
        });
    }

    async flushCache() {
        this.logger.info('Flushing cache.');
        await this.cache.flushCache();
    }

    /**
     * Main import process for all agencies in config.
     */
    async import() {
        await this.connectDb();
        const agencyCount = this.config.agencies.length;
        this.logger.info(`Starting the GTFS import for ${agencyCount} ${pluralize('file', agencyCount)}.`);
        await Promise.mapSeries(this.config.agencies, async agency => {
            if (!agency.agency_key) {
                throw new Error('No Agency Key provided.');
            }
            if (!agency.url && !agency.path) {
                throw new Error('No Agency URL or path provided.');
            }
            const { path, cleanup } = await dir({ unsafeCleanup: true });
            const task = {
                exclude: agency.exclude,
                agency_key: agency.agency_key,
                agency_url: agency.url,
                agency_headers: agency.headers || false,
                downloadDir: path,
                path: agency.path,
                csvOptions: this.config.csvOptions || {},
                cnx: this.cnx,
                log: (message, overwrite = false) => {
                    this.logger.info(`${agency.agency_key}: ${message}`, overwrite);
                },
                warn: message => {
                    this.logger.warn(message);
                },
                error: message => {
                    this.logger.error(message);
                }
            };
            // Get last modified date from database
            const lastDbUpdate = this.getLastDbUpdate ? await this.getLastDbUpdate() : null;
            // Get last modified date of the GTFS schedule data.
            const filesLastModifiedDate = await this.getFilesLastModifiedDate(task);

            // If both dates exist, and GTFS data is not newer than database, skip import.
            this.logger.info('Last DB Update:', lastDbUpdate);
            this.logger.info('Files Last Modified Date:', filesLastModifiedDate);
            if (lastDbUpdate && filesLastModifiedDate) {
                if (filesLastModifiedDate <= lastDbUpdate) {
                    task.log('GTFS schedule has not been updated since last import. Skipping import.');
                    await cleanup();
                    return;
                }
            } else if (filesLastModifiedDate === null) {
                task.log('Could not determine last modified date of GTFS schedule. Skipping import.');
                await cleanup();
                return;
            }

            // Download files if agency_url is provided
            this.logger.info('New GTFS data available. Downloading files.');
            if (task.agency_url) {
                await this.dropAllTables();
                await this.downloadFiles(task);
            }

            await this.readFiles(task);
            await this.importFiles(task);
            // Adding after import to avoid checks during insertion.
            // This speeds up inserts since MySQL doesn't validate references for each row.
            await this.createIndexesForAllTables();
            await this.addUniqueConstraints();
            await this.addForeignKeys();
            await addFeedInfoLastUpdatedColumn(task); // Add last updated column to feed_info table
            await updateFeedInfoLastUpdatedValues(task); // Update last updated column in feed_info table
            this.db.lastDbUpdate = await this.getLastDbUpdate(); // Update lastDbUpdate property in db client

            this.logger.info('Completed GTFS import for agency: ' + task.agency_key + '.');

            await this.flushCache(); // Clear cache after import to ensure new data is served
            await cleanup();
        });

        this.logger.info(`Completed GTFS import for ${agencyCount} ${pluralize('file', agencyCount)}.`);
    }
}

export default MysqlImporter;
