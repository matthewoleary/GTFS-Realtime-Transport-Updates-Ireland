import { describe, it, expect, vi, beforeEach } from 'vitest';
import MysqlImporter from '../mysql-import.js';

vi.mock('../utils/file-utils.js', () => ({
    unzip: vi.fn().mockResolvedValue(),
}));

vi.mock('node-fetch', () => ({
    default: vi.fn(),
}));
vi.mock('fs-extra', () => ({
    default: {
        writeFile: vi.fn(),
        existsSync: vi.fn(),
        createReadStream: vi.fn(() => ({
            pipe: vi.fn(function () { return this; }),
            on: vi.fn(function () { return this; }),
            destroy: vi.fn(),
            promise: vi.fn().mockResolvedValue(),
        })),
        copy: vi.fn(),
        readdir: vi.fn(),
        lstatSync: vi.fn(() => ({ isDirectory: () => false })),
        rename: vi.fn(),
    },
}));

vi.mock('path', () => ({
    extname: vi.fn(() => '.txt'),
}));

vi.mock('untildify', () => ({
    default: vi.fn(v => v),
}));

const fetch = (await import('node-fetch')).default;
const fs = (await import('fs-extra')).default;

describe('MysqlImporter', () => {
    let dbClientInstance;
    let importer;
    let logger;
    beforeEach(() => {
        logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        dbClientInstance = {};
        redisClientInstance = {};
        importer = new MysqlImporter({ agencies: [] }, logger, dbClientInstance, redisClientInstance);
        vi.clearAllMocks();
    });

    describe('Constructor and basic instantiation', () => {
        it('should instantiate with config and logger', () => {
            const config = { agencies: [{ agency_key: 'a' }] };
            const loggerObj = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
            dbClientInstance = {};
            const redisClientInstance = {};
            const imp = new MysqlImporter(config, loggerObj, dbClientInstance, redisClientInstance);
            expect(imp.config).toBe(config);
            expect(imp.logger).toBe(loggerObj);
            expect(imp.cnx).toBeNull();
            expect(Array.isArray(imp.customModels)).toBe(true);
            expect(imp.customModels.length).toBe(0);
            // Check that models is an array of objects with filenameBase and schema
            expect(Array.isArray(imp.models)).toBe(true);
            expect(imp.models.length).toBeGreaterThan(0);
            expect(imp.models[0]).toHaveProperty('filenameBase');
            expect(imp.models[0]).toHaveProperty('schema');
        });
    });

    describe('connectDb', () => {
        it('should call dbClientInstance.getConnection() and set importer.cnx', async () => {
            const fakeConnection = { some: 'connection' };
            const dbClientInstance = {
                getConnection: vi.fn().mockResolvedValue(fakeConnection),
                getLastDbUpdate: vi.fn()
            };
            const redisClientInstance = {};
            const imp = new MysqlImporter({ agencies: [] }, { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, dbClientInstance, redisClientInstance);
            await imp.connectDb();
            expect(dbClientInstance.getConnection).toHaveBeenCalled();
            expect(imp.cnx).toBe(fakeConnection);
            expect(imp.getLastDbUpdate).toBe(dbClientInstance.getLastDbUpdate);
        });
    });

    describe('downloadFiles', () => {
        it('should download files and write to disk', async () => {
            const task = {
                agency_url: 'http://example.com/gtfs.zip',
                agency_key: 'agency',
                downloadDir: '/tmp',
                log: vi.fn(),
            };
            const mockBuffer = new ArrayBuffer(4);
            fetch.mockResolvedValue({
                status: 200,
                arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
            });
            fs.writeFile.mockResolvedValue();
            await importer.downloadFiles(task);
            expect(fetch).toHaveBeenCalledWith('http://example.com/gtfs.zip', { method: 'GET', headers: {} });
            expect(fs.writeFile).toHaveBeenCalledWith('/tmp/agency-gtfs.zip', Buffer.from(mockBuffer));
            expect(task.log).toHaveBeenCalledWith('Download successful');
        });

        it('should throw if response status is not 200', async () => {
            const task = {
                agency_url: 'http://example.com/gtfs.zip',
                agency_key: 'agency',
                downloadDir: '/tmp',
                log: vi.fn(),
            };
            fetch.mockResolvedValue({ status: 404 });
            await expect(importer.downloadFiles(task)).rejects.toThrow('Couldn’t download files');
        });
    });

    describe('formatLine', () => {
        it('should format line with type conversion, required, min/max, and stop_times timestamp', () => {
            const config = { agencies: [] };
            const loggerObj = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
            const dbClientInstance = {};
            const redisClientInstance = {};
            const imp = new MysqlImporter(config, loggerObj, dbClientInstance, redisClientInstance);
            // Model schema
            const model = {
                filenameBase: 'stop_times',
                schema: [
                    { name: 'id', type: 'integer', required: true },
                    { name: 'val', type: 'real', min: 0, max: 10 },
                    { name: 'arrival_time', type: 'string' },
                    { name: 'departure_time', type: 'string' },
                ]
            };
            // Valid line
            const line = { id: '5', val: '3.5', arrival_time: '10:00:00', departure_time: '11:00:00', extra: 'remove' };
            const formatted = imp.formatLine({ ...line }, model, 0);
            expect(formatted.id).toBe(5);
            expect(formatted.val).toBe(3.5);
            expect(formatted.arrival_time).toBe('10:00:00');
            expect(formatted.departure_time).toBe('11:00:00');
            expect(formatted.extra).toBeUndefined();
            // Check timestamp fields
            expect(formatted.arrival_timestamp).toBe(36000); // 10:00:00 => 36000
            expect(formatted.departure_timestamp).toBe(39600); // 11:00:00 => 39600
            // Required missing (id is required, present but empty)
            expect(() => imp.formatLine({ id: '', val: '1.1' }, model, 0)).toThrow(/Missing required value/);
            // Min/max
            expect(() => imp.formatLine({ id: 1, val: -1 }, model, 0)).toThrow(/below minimum/);
            expect(() => imp.formatLine({ id: 1, val: 11 }, model, 0)).toThrow(/above maximum/);
        });
    });

    describe('getFilesLastModifiedDate', () => {
        it('should return last modified date if response is 200 and header exists', async () => {
            const task = {
                agency_url: 'http://example.com/gtfs.zip',
                agency_key: 'agency',
                downloadDir: '/tmp',
                log: vi.fn(),
            };
            const dateStr = 'Wed, 21 Oct 2015 07:28:00 GMT';
            fetch.mockResolvedValue({
                status: 200,
                headers: { get: vi.fn().mockImplementation((h) => h === 'last-modified' ? dateStr : null) }
            });
            const result = await importer.getFilesLastModifiedDate(task);
            expect(result).toEqual(new Date(dateStr));
        });

        it('should log error and return null if response is not 200', async () => {
            const task = {
                agency_url: 'http://example.com/gtfs.zip',
                agency_key: 'agency',
                downloadDir: '/tmp',
                log: vi.fn(),
            };
            fetch.mockResolvedValue({ status: 404 });
            const result = await importer.getFilesLastModifiedDate(task);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Errors code: 404'));
            expect(result).toBeNull();
        });
    });

    describe('getTextFiles', () => {
        it('should return only .txt files from a folder', async () => {
            // Simulate a list of files as would be found in a GTFS zip
            const files = [
                'stops.txt',
                'routes.txt',
                'shapes.txt',
                'README.md',
                'agency.csv',
                'calendar.txt',
                'notes.docx'
            ];
            // Mock fs.readdir to return our files
            fs.readdir = vi.fn().mockResolvedValue(files);
            const txtFiles = await importer.getTextFiles('/fake/path');
            expect(txtFiles).toEqual([
                'stops.txt',
                'routes.txt',
                'shapes.txt',
                'calendar.txt'
            ]);
        });
    });

    describe('readFiles', () => {
        it('should copy unzipped file to downloadDir', async () => {
            const task = {
                path: '/some/file.txt',
                downloadDir: '/dest',
                log: vi.fn(),
            };
            fs.copy = vi.fn().mockResolvedValue();
            await importer.readFiles(task);
            expect(fs.copy).toHaveBeenCalledWith('/some/file.txt', '/dest');
        });

        it('should unzip and move .txt files from zip', async () => {
            const task = {
                path: '/some/file.zip',
                downloadDir: '/dest',
                log: vi.fn(),
                error: vi.fn(),
            };
            // Temporarily mock path.extname to return '.zip' for this test
            const path = await import('path');
            const origExtname = path.extname;
            path.extname = vi.fn(() => '.zip');
            // Mock unzip
            importer.unzip = vi.fn().mockResolvedValue();
            // Mock getTextFiles to return .txt files
            importer.getTextFiles = vi.fn().mockResolvedValue(['stops.txt']);
            await importer.readFiles(task);
            expect(importer.getTextFiles).toHaveBeenCalledWith('/dest');
            // Restore path.extname
            path.extname = origExtname;
        });
    });

    describe('createEmptyTable', () => {
        it('should handle no primary key', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'no_pk',
                schema: [
                    { name: 'id', type: 'INTEGER', required: true },
                    { name: 'name', type: 'VARCHAR(255)' }
                ]
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query.mock.calls[0][0]).not.toMatch(/PRIMARY KEY/);
        });

        it('should handle composite primary key', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'composite_pk',
                schema: [
                    { name: 'id', type: 'INTEGER', primary: true },
                    { name: 'other_id', type: 'INTEGER', primary: true },
                    { name: 'name', type: 'VARCHAR(255)' }
                ]
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/PRIMARY KEY \(id, other_id\)/);
        });

        it('should handle min only constraint', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'min_only',
                schema: [
                    { name: 'score', type: 'FLOAT', min: 10 }
                ]
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/score\s+FLOAT\s+CHECK\(\s*score\s*>=\s*10\s*\)/);
        });

        it('should handle max only constraint', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'max_only',
                schema: [
                    { name: 'score', type: 'FLOAT', max: 50 }
                ]
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/score\s+FLOAT\s+CHECK\(\s*score\s*<=\s*50\s*\)/);
        });

        it('should handle default value', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'default_val',
                schema: [
                    { name: 'score', type: 'FLOAT', default: 42 }
                ]
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/score\s+FLOAT\s+DEFAULT\s+42/);
        });

        it('should not call query for empty schema', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'empty_schema',
                schema: []
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query).not.toHaveBeenCalled();
        });

        it('should not call query for null schema', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'null_schema',
                schema: null
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query).not.toHaveBeenCalled();
        });
        it('should generate and execute correct CREATE TABLE SQL', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'test_table',
                schema: [
                    { name: 'id', type: 'INTEGER', primary: true, identity: true, required: true },
                    { name: 'name', type: 'VARCHAR(255)', required: true, unique: true },
                    { name: 'score', type: 'FLOAT', min: 0, max: 100 },
                    { name: 'desc', type: 'TEXT' }
                ]
            };
            await importer.createEmptyTable(model);
            expect(importer.cnx.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE test_table'),
            );
            // Check for primary key
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/PRIMARY KEY \(id\)/);
            // Check for NOT NULL
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/name\s+VARCHAR\(255\)\s+NOT NULL/);
            // Check for AUTO_INCREMENT
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/id\s+INTEGER\s+AUTO_INCREMENT\s+NOT NULL/);
            // Check for CHECK constraint
            expect(importer.cnx.query.mock.calls[0][0]).toMatch(/score\s+FLOAT\s+CHECK\(\s*score\s*>=\s*0\s*AND\s*score\s*<=\s*100\s*\)/);
        });
    });

    describe('dropAllTables', () => {
        it('should disable FK checks, drop tables, and re-enable FK checks', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            await importer.dropAllTables();
            // Should disable FK checks
            expect(importer.cnx.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0;');
            // Should call at least one DROP TABLE IF EXISTS ...
            const dropTableCalls = importer.cnx.query.mock.calls.filter(
                ([sql]) => typeof sql === 'string' && sql.startsWith('DROP TABLE IF EXISTS')
            );
            expect(dropTableCalls.length).toBeGreaterThan(0);
            // Should re-enable FK checks
            expect(importer.cnx.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1;');
        });
    });

    describe('truncateAllTables', () => {
        it('should disable FK checks, truncate tables, and re-enable FK checks', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            importer.customModels = [
                { filenameBase: 'table1', schema: [{}] },
                { filenameBase: 'table2', schema: [{}] }
            ];
            await importer.truncateAllTables();
            expect(importer.cnx.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0;');
            expect(importer.cnx.query).toHaveBeenCalledWith('TRUNCATE TABLE table1;');
            expect(importer.cnx.query).toHaveBeenCalledWith('TRUNCATE TABLE table2;');
            expect(importer.cnx.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1;');
        });
        it('should not call query for empty customModels', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            importer.customModels = [];
            await importer.truncateAllTables();
            // Only FK toggles
            expect(importer.cnx.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0;');
            expect(importer.cnx.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1;');
            expect(importer.cnx.query).not.toHaveBeenCalledWith(expect.stringMatching(/^TRUNCATE TABLE/));
        });
    });

    describe('createIndexesForAllTables', () => {
        it('should create single and composite indexes', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue([[{ count: 0 }]]) };
            importer.customModels = [
                {
                    filenameBase: 'table1',
                    schema: [
                        { name: 'col1', index: true },
                        { name: 'col2', index: 'unique' }
                    ],
                    indexes: [
                        { fields: ['col1', 'col2'], unique: true }
                    ]
                }
            ];
            await importer.createIndexesForAllTables();
            // Single-column
            expect(importer.cnx.query).toHaveBeenCalledWith(expect.stringContaining('CREATE  INDEX idx_table1_col1 ON table1 (col1)'));
            expect(importer.cnx.query).toHaveBeenCalledWith(expect.stringContaining('CREATE UNIQUE INDEX idx_table1_col2 ON table1 (col2)'));
            // Composite
            expect(importer.cnx.query).toHaveBeenCalledWith(expect.stringContaining('CREATE UNIQUE INDEX idx_table1_col1_col2 ON table1 (col1, col2)'));
        });
    });

    describe('addForeignKeys', () => {
        it('should add foreign key constraints if not present', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue([[{ count: 0 }]]) };
            importer.customModels = [
                {
                    filenameBase: 'table1',
                    schema: [
                        { name: 'col1', foreign_key: { table: 'other', column: 'id' } }
                    ]
                }
            ];
            await importer.addForeignKeys();
            expect(importer.cnx.query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT fk_table1_col1'));
        });
        it('should not add constraint if already present', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue([[{ count: 1 }]]) };
            importer.customModels = [
                {
                    filenameBase: 'table1',
                    schema: [
                        { name: 'col1', foreign_key: { table: 'other', column: 'id' } }
                    ]
                }
            ];
            await importer.addForeignKeys();
            expect(importer.cnx.query).not.toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT fk_table1_col1'));
        });
    });

    describe('addUniqueConstraints', () => {
        it('should add unique constraint if not present', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue([[{ count: 0 }]]) };
            importer.customModels = [
                {
                    filenameBase: 'table1',
                    schema: [
                        { name: 'col1', unique: true }
                    ]
                }
            ];
            await importer.addUniqueConstraints();
            expect(importer.cnx.query).toHaveBeenCalledWith(expect.stringContaining('CREATE UNIQUE INDEX idx_unique_table1_col1'));
        });
        it('should not add unique constraint if already present', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue([[{ count: 1 }]]) };
            importer.customModels = [
                {
                    filenameBase: 'table1',
                    schema: [
                        { name: 'col1', unique: true }
                    ]
                }
            ];
            await importer.addUniqueConstraints();
            expect(importer.cnx.query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE UNIQUE INDEX idx_unique_table1_col1'));
        });
    });

    describe('importLines', () => {
        it('should build correct SQL and call query', async () => {
            importer.cnx = { query: vi.fn().mockResolvedValue() };
            const model = {
                filenameBase: 'table1',
                schema: [
                    { name: 'id', type: 'INTEGER' },
                    { name: 'val', type: 'FLOAT' }
                ]
            };
            const lines = [{ id: 1, val: 2.5 }, { id: 2, val: 3.5 }];
            const task = { cnx: importer.cnx, warn: vi.fn(), log: vi.fn() };
            await importer.importLines(task, [...lines], model, 2);
            expect(importer.cnx.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO table1'));
        });
    });

    describe('addFeedInfoLastUpdatedColumn', () => {
        it('should add feed_last_updated column to feed_info table', async () => {
            const task = { cnx: { query: vi.fn().mockResolvedValue() }, warn: vi.fn() };
            await import('../../queries/custom-queries.js').then(({ addFeedInfoLastUpdatedColumn }) => addFeedInfoLastUpdatedColumn(task));
            expect(task.cnx.query).toHaveBeenCalledWith(expect.stringContaining('ALTER TABLE feed_info ADD feed_last_updated DATETIME'));
        });
        it('should warn and throw on error', async () => {
            const task = { cnx: { query: vi.fn().mockRejectedValue(new Error('fail')) }, warn: vi.fn() };
            await import('../../queries/custom-queries.js').then(async ({ addFeedInfoLastUpdatedColumn }) => {
                await expect(addFeedInfoLastUpdatedColumn(task)).rejects.toThrow('fail');
                expect(task.warn).toHaveBeenCalledWith('Error adding feed_last_updated to feed_info');
            });
        });
    });

    describe('updateFeedInfoLastUpdatedValues', () => {
        it('should update feed_last_updated values in feed_info table', async () => {
            const task = { cnx: { query: vi.fn().mockResolvedValue() }, warn: vi.fn() };
            await import('../../queries/custom-queries.js').then(({ updateFeedInfoLastUpdatedValues }) => updateFeedInfoLastUpdatedValues(task));
            expect(task.cnx.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE feed_info'));
        });
        it('should warn and throw on error', async () => {
            const task = { cnx: { query: vi.fn().mockRejectedValue(new Error('fail')) }, warn: vi.fn() };
            await import('../../queries/custom-queries.js').then(async ({ updateFeedInfoLastUpdatedValues }) => {
                await expect(updateFeedInfoLastUpdatedValues(task)).rejects.toThrow('fail');
                expect(task.warn).toHaveBeenCalledWith('Error updating feed_last_updated in feed_info');
            });
        });
    });
});