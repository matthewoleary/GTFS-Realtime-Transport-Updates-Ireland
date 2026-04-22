import Logger from '../../logger.js';

/**
 * CacheServiceLogger class for logging cache service events.
 * Extends the shared Logger class and adds a query() method for cache operations.
 */
export default class CacheServiceLogger extends Logger {
    constructor(options = {}) {
        super({
            client: options.client || 'CACHESERVICELOGGER',
            successMessage: options.successMessage || 'Cache service operation successful.',
            errorMessage: options.errorMessage || 'Cache service error encountered.'
        });
        this.queryMessage = options.queryMessage || 'Executing cache service operation.';
    }

    /**
     * Logs a cache service operation event.
     * @param {string} [message] - The message to log.
     */
    query(message) {
        this.info(`[QUERY] ${message || this.queryMessage}`);
    }
}
