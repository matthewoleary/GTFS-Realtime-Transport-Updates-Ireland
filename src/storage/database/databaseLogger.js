import Logger from '../../logger.js';

/**
 * DatabaseLogger class for logging database events.
 * Extends the shared Logger class and adds a query() method.
 */
export default class DatabaseLogger extends Logger {
    constructor(options = {}) {
        super({
            client: options.client || 'DATABASELOGGER',
            successMessage: options.successMessage || 'Database operation successful.',
            errorMessage: options.errorMessage || 'Database error encountered.'
        });
        this.queryMessage = options.queryMessage || 'Executing database query.';
    }

    /**
     * Logs a database query event.
     * @param {string} [message] - The message to log.
     */
    query(message) {
        // Use the same timestamped format as base logger
        this.info(`[QUERY] ${message || this.queryMessage}`);
    }
}
