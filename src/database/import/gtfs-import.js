import ImportLogger from './importLogger.js';
import { gtfsImportConfig } from '../config.js';

/* eslint-disable unicorn/no-process-exit */
function handleError(err) {
    const text = err || 'Unknown Error';
    console.error(`\n${text}\n`);
    console.error(err);
    process.exit(1);
}

async function setupImport(dbClientInstance) {
    const logger = new ImportLogger({ client: 'MYSQL_IMPORTER' });
    const MysqlImporter = (await import('./mysql-import.js')).default;
    const importer = new MysqlImporter(gtfsImportConfig, logger, dbClientInstance);
    await importer.import();
}

export async function runImport(dbClientInstance) {
    await setupImport(dbClientInstance).catch(handleError);
}
