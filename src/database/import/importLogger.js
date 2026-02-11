import chalk from 'chalk';
const { blue, cyan, magenta } = chalk;
import Logger from '../../logger.js';
import { getCurrentTime } from '../../utils/timestampUtils.js';

/**
 * ImportLogger class for logging GTFS import events.
 * Extends the shared Logger class. Adds overwrite support to info().
 */
export default class ImportLogger extends Logger {
    constructor(options = {}) {
        super({
            client: options.client || 'IMPORTLOGGER',
            infoMessage: options.infoMessage || 'Import info.',
            warnMessage: options.warnMessage || 'Import warning.',
            errorMessage: options.errorMessage || 'Import error.'
        });
    }

    /**
     * Logs an informational import event, with optional overwrite.
     * @param {string} [message] - The message to log.
     * @param {boolean} [overwrite] - If true, overwrites the current line.
     */
    info(message, overwrite = false) {
        const logMsg = `[${cyan(getCurrentTime())}] [${blue('INFO')}] [${magenta(this.client)}] ${message || this.infoMessage}`;
        if (overwrite) {
            process.stdout.write(logMsg + '\r');
        } else {
            super.info(message);
        }
    }
}
