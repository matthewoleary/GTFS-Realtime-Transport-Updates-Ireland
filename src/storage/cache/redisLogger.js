import Logger from '../../logger.js';

/**
 * RedisLogger class for logging Redis events.
 * Extends the shared Logger class and adds a query() method for Redis operations.
 */
export default class RedisLogger extends Logger {
    constructor(options = {}) {
        super({
            client: options.client || 'REDISLOGGER',
            successMessage: options.successMessage || 'Redis operation successful.',
            errorMessage: options.errorMessage || 'Redis error encountered.'
        });
        this.queryMessage = options.queryMessage || 'Executing Redis command.';
    }

    /**
     * Logs a Redis command/query event.
     * @param {string} [message] - The message to log.
     */
    query(message) {
        this.info(`[QUERY] ${message || this.queryMessage}`);
    }
}
