import Logger from '../logger.js';

/**
 * RealtimeLogger class for logging GTFS-realtime feed events.
 * Extends the shared Logger class. Adds updateFeed() and errorFetchingFeed().
 */
export default class RealtimeLogger extends Logger {
    constructor(options = {}) {
        super({
            client: options.client || 'REALTIMELOGGER',
            successMessage: options.successMessage || 'Successful GTFS-R response.',
            errorMessage: options.errorFetchingFeedMessage || 'Error fetching GTFS-R feed.'
        });
        this.updateFeedMessage = options.updateFeedMessage || 'Updating realtime feed.';
    }

    /**
     * Logs a feed update event.
     * @param {string} [message] - The message to log.
     */
    updateFeed(message) {
        this.info(`[UPDATE] ${message || this.updateFeedMessage}`);
    }

    /**
     * Logs an error encountered while fetching the feed.
     * @param {Error|string} [error] - The error to log.
     * @param {string} [message] - The message to log.
     */
    errorFetchingFeed(error, message) {
        if (error) {
            super.error(error + (message ? ` - ${message}` : ''));
        } else {
            super.error(this.errorMessage + (message ? ` - ${message}` : ''));
        }
    }
}
    