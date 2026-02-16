import Logger from '../logger.js';

/**
 * ServerLogger class for logging server events.
 * Extends the shared Logger class.
 */
export default class ServerLogger extends Logger {
    constructor(options = {}) {
        super({
            client: options.client || 'SERVER',
            infoMessage: options.infoMessage || 'Server info.',
            successMessage: options.successMessage || 'Server operation successful.',
            warnMessage: options.warnMessage || 'Server warning.',
            errorMessage: options.errorMessage || 'Server error encountered.'
        });
    }
}
