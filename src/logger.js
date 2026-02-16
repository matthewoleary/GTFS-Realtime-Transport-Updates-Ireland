import chalk from 'chalk';
const { red, yellow, green, blue, magenta, cyan } = chalk;

import { getCurrentTime } from './utils/timestampUtils.js';

/**
 * Logger base class for structured logging with timestamp and client context.
 * Extend this class for specialized loggers (server, database, import, realtime, etc).
 */
export default class Logger {
    /**
     * @param {Object} [options] - Optional custom messages for logging.
     * @param {string} [options.client] - Default client name for logs.
     * @param {string} [options.infoMessage] - Default message for info logs.
     * @param {string} [options.successMessage] - Default message for success logs.
     * @param {string} [options.warnMessage] - Default message for warning logs.
     * @param {string} [options.errorMessage] - Default message for error logs.
     */
    constructor(options = {}) {
        this.client = options.client || 'LOGGER';
        this.infoMessage = options.infoMessage || 'Info.';
        this.successMessage = options.successMessage || 'Operation successful.';
        this.warnMessage = options.warnMessage || 'Warning.';
        this.errorMessage = options.errorMessage || 'Error encountered.';
    }

    /**
     * Logs an informational event.
     * @param {string} [message] - The message to log.
     */

    info(message) {
        console.log(`[${cyan(getCurrentTime())}] [${blue('INFO')}] [${magenta(this.client)}] ${message || this.infoMessage}`);
    }

    /**
     * Logs a successful operation.
     * @param {string} [message] - The message to log.
     */

    success(message) {
        console.log(`[${cyan(getCurrentTime())}] [${green('SUCCESS')}] [${magenta(this.client)}] ${message || this.successMessage}`);
    }

    /**
     * Logs a warning event.
     * @param {string} [message] - The message to log.
     */

    warn(message) {
        console.warn(`[${cyan(getCurrentTime())}] [${yellow('WARN')}] [${magenta(this.client)}] ${message || this.warnMessage}`);
    }

    /**
     * Logs an error event.
     * @param {Error|string} [error] - The error to log.
     */

    error(error) {
        if (error) {
            console.error(`[${cyan(getCurrentTime())}] [${red('ERROR')}] [${magenta(this.client)}] ${error}`);
        } else {
            console.error(`[${cyan(getCurrentTime())}] [${red('ERROR')}] [${magenta(this.client)}] ${this.errorMessage}`);
        }
    }
}
