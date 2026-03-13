import ImportLogger from './importLogger.js';
import { gtfsImportConfig } from '../config.js';

export async function runImport(dbClientInstance) {
    const logger = new ImportLogger({ client: 'MYSQL_IMPORTER' });
    const MysqlImporter = (await import('./mysql-import.js')).default;
    const importer = new MysqlImporter(gtfsImportConfig, logger, dbClientInstance);
    await importer.import();
}
