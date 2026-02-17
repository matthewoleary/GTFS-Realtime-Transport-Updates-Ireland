import { CronJob } from 'cron';
import app from './app.js';
import config from './config.js';
import { runImport } from './database/import/gtfs-import.js';
import Logger from './logger.js';
const logger = new Logger({ client: 'APP' });

const startServer = async env => {
	try {
		let configEnv;
		env === 'prod' ? configEnv = config.prod : configEnv = config.test;
		const appInstance = await app(configEnv);

		await executeRunImport();

		// Every hour will check for GTFS static schedule updates and import if available.
		logger.info('Scheduling GTFS static schedule updates every hour');
		const job = new CronJob('0 * * * *', async () => {
			try {
				logger.info('Running scheduled GTFS static schedule update check and import if available. Time: ' + new Date().toISOString());
				await executeRunImport();
			} catch (error) {
				logger.error('Scheduled GTFS import failed: ' + error);
			}
		}, null, true);

		await appInstance.start();
		logger.success(`Server running at http://${configEnv.host}:${configEnv.port}`);
	} catch (error) {
		logger.error('Startup error: ' + error);
	}
};

const executeRunImport = async () => {
	try {
		await runImport();
		logger.success('Import completed successfully');
	} catch (error) {
		logger.error('Import failed: ' + error.message);
	}
}

startServer(process.argv[2]).catch(error => {
	logger.error('Failed to start server: ' + error);
	process.exit(1);
});

process.on('unhandledRejection', (err) => {
	logger.error('Unhandled Rejection: ' + err);
});

process.on('uncaughtException', (err) => {
	logger.error('Uncaught Exception: ' + err);
});