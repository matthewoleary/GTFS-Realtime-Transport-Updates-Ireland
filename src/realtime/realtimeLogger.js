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
     */
    errorFetchingFeed(error) {
        if (error) {
            super.error(error);
        } else {
            super.error(this.errorMessage);
        }
    }
}
