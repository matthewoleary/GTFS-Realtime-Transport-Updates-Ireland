
import ImportLogger from './importLogger.js';
import { gtfsImportConfig } from '../config.js';
import MysqlImporter from './mysql-import.js';

export async function runImport(dbClient, cacheClient) {
    const logger = new ImportLogger({ client: 'MYSQL_IMPORTER' });
    const importer = new MysqlImporter(gtfsImportConfig, logger, dbClient, cacheClient);
    await importer.import();
}
