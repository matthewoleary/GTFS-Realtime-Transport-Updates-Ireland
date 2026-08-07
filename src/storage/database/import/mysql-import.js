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
import {
    calculateResourceRevisions,
    hasCompleteResourceRevisions,
    loadResourceRevisions,
    saveResourceRevisions,
    TABLE_SOURCE_FILES
} from './resource-revisions.js';
import { importFileWithBulkLoader, isLocalInfileEnabled, supportsBulkImportFor } from './bulk-import.js';

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
        this.bulkImportAvailable = null;
        this.stagingTableNames = {};
    }

    async connectDb() {
        // Connect to the MySQL database using the database client
        this.cnx = await this.db.getConnection();
        this.getLastDbUpdate = this.db.getLastDbUpdate;
    }

    /**
     * Run an importer phase with success/failure duration logging.
     * @param {string} name - Human-readable phase name.
     * @param {Function} operation - Synchronous or asynchronous operation to run.
     * @returns {Promise<*>} Result returned by the operation.
     */
    async timed(name, operation) {
        const startedAt = performance.now();
        try {
            const result = await operation();
            this.logger.info(`${name} completed in ${Math.round(performance.now() - startedAt)} ms.`);
            return result;
        } catch (error) {
            this.logger.error(`${name} failed after ${Math.round(performance.now() - startedAt)} ms: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check and memoize whether this import can use LOAD DATA LOCAL INFILE.
     * @returns {Promise<boolean>} Whether native bulk loading is available.
     */
    async canUseBulkImport() {
        if (this.bulkImportAvailable === null) {
            this.bulkImportAvailable = await isLocalInfileEnabled(this.cnx);
            if (!this.bulkImportAvailable) {
                this.logger.warn('MySQL local_infile is unavailable; using batched GTFS inserts.');
            }
        }
        return this.bulkImportAvailable;
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
        await this.cnx.query(`CREATE TABLE ${model.tableName || model.filenameBase} (${columns}${primaryKeyClause});`);
    }

    /**
     * Assign a unique physical staging table name to every GTFS model.
     * A shared suffix keeps all tables from one import identifiable as a set.
     * @returns {Record<string, string>} Logical-to-physical table name mapping.
     */
    createStagingTableNames() {
        const suffix = `stage_${Date.now().toString(36)}`;
        this.stagingTableNames = Object.fromEntries(
            this.models.map(model => [model.filenameBase, `${model.filenameBase}_${suffix}`])
        );
        return this.stagingTableNames;
    }

    /**
     * Drop explicitly named physical tables while temporarily disabling foreign
     * key checks. Foreign key checks are restored even when a drop fails.
     * @param {string[]} tableNames - Exact physical table names to remove.
     * @returns {Promise<void>}
     */
    async dropPhysicalTables(tableNames) {
        if (tableNames.length === 0) return;
        await this.cnx.query('SET FOREIGN_KEY_CHECKS = 0;');
        try {
            await this.cnx.query(`DROP TABLE IF EXISTS ${tableNames.join(', ')}`);
        } finally {
            await this.cnx.query('SET FOREIGN_KEY_CHECKS = 1;');
        }
    }

    /**
     * Atomically publish all newly imported staging tables with one RENAME TABLE
     * statement, then remove the displaced live tables.
     * @returns {Promise<void>}
     * @throws {Error} When no staging tables are available to publish.
     */
    async publishStagingTables() {
        const baseNames = this.models.map(model => model.filenameBase);
        const previousNames = baseNames.map(name => `${name}_previous`);
        await this.dropPhysicalTables(previousNames);

        const [existingRows] = await this.cnx.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
                AND table_name IN (?)
        `, [baseNames]);
        const existing = new Set(existingRows.map(row => row.TABLE_NAME || row.table_name));
        const imported = new Set(this.customModels.map(model => model.filenameBase));
        const renames = [];
        for (const baseName of baseNames) {
            if (!imported.has(baseName)) continue;
            if (existing.has(baseName)) {
                renames.push(`${baseName} TO ${baseName}_previous`);
            }
            renames.push(`${this.stagingTableNames[baseName]} TO ${baseName}`);
        }
        if (renames.length === 0) {
            throw new Error('No GTFS staging tables were available to publish.');
        }
        await this.cnx.query(`RENAME TABLE ${renames.join(', ')}`);
        try {
            await this.dropPhysicalTables(previousNames);
        } catch (error) {
            this.logger.warn(`Published GTFS tables but could not remove previous tables: ${error.message}`);
        }
    }

    /**
     * Verify that each required table was staged or deliberately reused/excluded
     * before publication.
     * @param {string[]} excludedTables - Logical tables not expected in staging.
     * @returns {void}
     * @throws {Error} When a required staging table is missing.
     */
    ensureStagingDatasetIsComplete(excludedTables = []) {
        const excluded = new Set(excludedTables);
        const imported = new Set(this.customModels.map(model => model.filenameBase));
        const missing = this.models
            .filter(model => model.schema && !excluded.has(model.filenameBase))
            .map(model => model.filenameBase)
            .filter(tableName => !imported.has(tableName));
        if (missing.length > 0) {
            throw new Error(`GTFS staging dataset is incomplete; missing tables: ${missing.join(', ')}.`);
        }
    }

    /**
     * Select tables whose source-file revision changed. feed_info is always
     * rebuilt so the database update timestamp advances after a forced import.
     * @param {Record<string, string>} resourceRevisions - Revisions just calculated.
     * @param {Record<string, string>} storedRevisions - Revisions saved previously.
     * @returns {Set<string>} Logical table names that must be rebuilt.
     */
    selectChangedTables(resourceRevisions, storedRevisions) {
        return new Set(
            this.models
                .map(model => model.filenameBase)
                .filter(tableName => {
                    if (tableName === 'feed_info') return true;
                    const filename = TABLE_SOURCE_FILES[tableName];
                    return !filename
                        || storedRevisions[`file:${filename}`] !== resourceRevisions[`file:${filename}`];
                })
        );
    }

    /**
     * Determine whether stop-time references may have changed and need checking.
     * @param {Set<string>} changedTables - Logical tables selected for rebuilding.
     * @returns {boolean} Whether relationship validation is required.
     */
    shouldValidateStopTimeRelationships(changedTables) {
        return ['stops', 'trips', 'stop_times'].some(tableName => changedTables.has(tableName));
    }

    /**
     * Determine whether cached API resources may be stale. A feed_info-only
     * rebuild changes import metadata but no cached public GTFS representation.
     * @param {Set<string>} changedTables - Logical tables selected for rebuilding.
     * @returns {boolean} Whether Redis should be flushed.
     */
    shouldFlushCache(changedTables) {
        return [...changedTables].some(tableName => tableName !== 'feed_info');
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

    /**
     * Add configured indexes and foreign keys to newly imported staging tables.
     * Clauses are consolidated into one ALTER TABLE statement per table.
     * @returns {Promise<void>}
     */
    async finalizeTables() {
        this.logger.info('Creating indexes and foreign keys for all GTFS tables.');
        for (const model of this.customModels) {
            if (!model.schema) continue;
            await this.timed(`Finalizing ${model.filenameBase}`, async () => {
                const tableName = model.tableName || model.filenameBase;
                const primaryKey = model.schema.filter(column => column.primary).map(column => column.name);
                const clauses = [];
                const indexNames = new Set();
                const addIndex = (fields, unique = false, namePrefix = 'idx') => {
                    const coveredByPrimaryKey = fields.every((field, index) => primaryKey[index] === field);
                    if (coveredByPrimaryKey) return;
                    const indexName = `${namePrefix}_${model.filenameBase}_${fields.join('_')}`;
                    if (indexNames.has(indexName)) return;
                    indexNames.add(indexName);
                    clauses.push(`ADD ${unique ? 'UNIQUE ' : ''}INDEX ${indexName} (${fields.join(', ')})`);
                };

                for (const column of model.schema) {
                    if (column.index) addIndex([column.name], column.index === 'unique');
                    if (column.unique) addIndex([column.name], true, 'idx_unique');
                }
                for (const index of model.indexes || []) {
                    addIndex(index.fields, index.unique);
                }
                for (const column of model.schema) {
                    if (!column.foreign_key) continue;
                    const referencedTable = this.customModels.some(candidate =>
                        candidate.filenameBase === column.foreign_key.table
                    )
                        ? this.stagingTableNames[column.foreign_key.table]
                        : column.foreign_key.table;
                    clauses.push(
                        `ADD CONSTRAINT fk_${tableName}_${column.name} `
                        + `FOREIGN KEY (${column.name}) `
                        + `REFERENCES ${referencedTable}(${column.foreign_key.column}) `
                        + 'ON DELETE CASCADE'
                    );
                }

                if (clauses.length > 0) {
                    await this.cnx.query(`ALTER TABLE ${tableName} ${clauses.join(', ')}`);
                }
            });
        }
    }

    /**
     * Validate stop_times references against the candidate dataset, combining
     * staged tables with unchanged live tables as appropriate.
     * @returns {Promise<{missingTrips: number, missingStops: number}>} Validation counts.
     * @throws {Error} When any referenced trip or stop is missing.
     */
    async validateStopTimeRelationships() {
        const candidateTable = baseName => this.customModels.some(model => model.filenameBase === baseName)
            ? this.stagingTableNames[baseName]
            : baseName;
        const stopTimes = candidateTable('stop_times');
        const trips = candidateTable('trips');
        const stops = candidateTable('stops');
        const [rows] = await this.cnx.query(`
            SELECT
                (
                    SELECT COUNT(*)
                    FROM ${stopTimes} st
                    LEFT JOIN ${trips} t ON t.trip_id = st.trip_id
                    WHERE t.trip_id IS NULL
                ) AS missing_trips,
                (
                    SELECT COUNT(*)
                    FROM ${stopTimes} st
                    LEFT JOIN ${stops} s ON s.stop_id = st.stop_id
                    WHERE st.stop_id IS NOT NULL
                        AND s.stop_id IS NULL
                ) AS missing_stops
        `);
        const missingTrips = Number(rows[0].missing_trips);
        const missingStops = Number(rows[0].missing_stops);
        if (missingTrips > 0 || missingStops > 0) {
            throw new Error(
                `GTFS relationship validation failed: ${missingTrips} missing trip references, `
                + `${missingStops} missing stop references.`
            );
        }
        return { missingTrips, missingStops };
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
            await task.cnx.query(`INSERT INTO ${model.tableName || model.filenameBase}(${fieldNames.join(', ')}) VALUES ${formattedValues.join(',')};`);
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
    async importFiles(task, changedTables = null) {
        // Loop through each GTFS file
        return Promise.mapSeries(this.models, async model => this.timed(`Importing ${model.filenameBase}`, async () => {
            if (changedTables && !changedTables.has(model.filenameBase)) {
                task.log(`Reusing unchanged live table - ${model.filenameBase}`);
                return;
            }
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
            const fileColumns = headerLine.replace(/^\uFEFF/, '').split(',').map(h => h.trim());
            // Create table with only columns present in both schema and file header
            this.customModel = {
                ...model,
                // Always ensure filenameBase is present
                filenameBase: model.filenameBase,
                tableName: this.stagingTableNames[model.filenameBase],
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
                await addCustomTimestampColumns(task, this.customModel, this.customModel.tableName);
            }
            // Add the modified or unmodified model to the list of custom models
            this.customModels.push(this.customModel);
            // Now read and import the file line by line
            task.log(`Importing - ${model.filenameBase}.txt\r`);
            if (supportsBulkImportFor(this.customModel) && await this.canUseBulkImport()) {
                const importedCount = await importFileWithBulkLoader(
                    task.cnx,
                    filepath,
                    fileColumns,
                    this.customModel
                );
                task.log(`Imported - ${model.filenameBase}.txt - ${importedCount} total lines using MySQL bulk loading`);
                return;
            }
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
            task.log(`Imported - ${model.filenameBase}.txt - ${totalLineCount} total lines`);
        }));
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
            this.db.lastDbUpdate = lastDbUpdate;
            // Get last modified date of the GTFS schedule data.
            const filesLastModifiedDate = await this.getFilesLastModifiedDate(task);

            // If both dates exist, and GTFS data is not newer than database, skip import.
            this.logger.info('Last DB Update:', lastDbUpdate);
            this.logger.info('Files Last Modified Date:', filesLastModifiedDate);
            if (lastDbUpdate && filesLastModifiedDate) {
                if (filesLastModifiedDate <= lastDbUpdate) {
                    const hasRevisions = await hasCompleteResourceRevisions(this.cnx);
                    if (hasRevisions) {
                        task.log('GTFS schedule has not been updated since last import. Skipping import.');
                        await cleanup();
                        return;
                    }
					task.log('GTFS schedule is unchanged, but resource revisions are missing. Reimporting once.');
                }
            } else if (filesLastModifiedDate === null) {
                task.log('Could not determine last modified date of GTFS schedule. Skipping import.');
                await cleanup();
                return;
            }

            // Download and validate the archive before modifying the live tables.
            this.logger.info('New GTFS data available. Downloading files.');
            if (task.agency_url) {
                await this.timed('GTFS download', () => this.downloadFiles(task));
            }

            await this.timed('GTFS extraction', () => this.readFiles(task));
            const textFiles = await this.getTextFiles(task.downloadDir);
            const resourceRevisions = await this.timed(
                'Resource revision calculation',
                () => calculateResourceRevisions(task.downloadDir, textFiles)
            );
            const storedRevisions = await loadResourceRevisions(this.cnx);
            const changedTables = this.selectChangedTables(resourceRevisions, storedRevisions);
            this.logger.info(`GTFS tables selected for rebuild: ${[...changedTables].join(', ')}.`);
            this.customModels = [];
            this.createStagingTableNames();
            let published = false;
            try {
                await this.importFiles(task, changedTables);
                const reusedOrExcluded = this.models
                    .map(model => model.filenameBase)
                    .filter(tableName => !changedTables.has(tableName) || task.exclude?.includes(tableName));
                this.ensureStagingDatasetIsComplete(reusedOrExcluded);
                // Add indexes and constraints together after import to minimize table rebuilds.
                await this.finalizeTables();
                if (this.shouldValidateStopTimeRelationships(changedTables)) {
                    await this.timed(
                        'Validating GTFS relationships',
                        () => this.validateStopTimeRelationships()
                    );
                } else {
                    this.logger.info('GTFS relationship validation skipped; related tables are unchanged.');
                }
                const stagedFeedInfo = this.stagingTableNames.feed_info;
                await addFeedInfoLastUpdatedColumn(task, stagedFeedInfo);
                await updateFeedInfoLastUpdatedValues(task, stagedFeedInfo);
                await this.timed('Publishing GTFS tables', () => this.publishStagingTables());
                published = true;
                await this.timed(
                    'Saving resource revisions',
                    () => saveResourceRevisions(this.cnx, resourceRevisions)
                );
                this.db.lastDbUpdate = await this.getLastDbUpdate(); // Update lastDbUpdate property in db client

                this.logger.info('Completed GTFS import for agency: ' + task.agency_key + '.');
                if (this.shouldFlushCache(changedTables)) {
                    await this.timed('Cache flush', () => this.flushCache());
                } else {
                    this.logger.info('Cache flush skipped; cached GTFS resources are unchanged.');
                }
            } catch (error) {
                if (!published) {
                    await this.timed(
                        'Discarding GTFS staging tables',
                        () => this.dropPhysicalTables(Object.values(this.stagingTableNames))
                    );
                }
                throw error;
            } finally {
                await this.timed('Temporary file cleanup', cleanup);
            }
        });

        this.logger.info(`Completed GTFS import for ${agencyCount} ${pluralize('file', agencyCount)}.`);
    }
}

export default MysqlImporter;
