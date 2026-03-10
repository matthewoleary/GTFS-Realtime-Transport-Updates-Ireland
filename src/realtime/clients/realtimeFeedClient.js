import gtfsRealtimeBindings from 'gtfs-realtime-bindings';
import axios from 'axios';
import { getCurrentTimestamp } from '../../utils/timestampUtils.js';

/**
 * Base class for GTFS-realtime feed clients (TripUpdates, VehiclePositions, etc.)
 * Handles polling, feed decoding, and query registration.
 */
export default class RealtimeFeedClient {
    /**
     * @param {Object} logger - Logger instance for logging feed events.
     * @param {string} apiKey - API key for GTFS-realtime feed.
     * @param {string} apiURL - URL for GTFS-realtime feed.
     * @param {string} [apiURLFallback] - Fallback URL for GTFS-realtime feed if primary URL fails.
     * @param {Object} processor - Processor module for processing the query object.
     * @param {Function} buildTripIdMapFn - Function to build tripId map from feed
     * @param {number} [dayServiceInterval] - Polling interval for day service
     * @param {number} [nightServiceInterval] - Polling interval for night service
     * @param {number} [recoveryInterval] - Interval for checking recovery of primary URL when fallback is active.
     * @property {string} activeURL - The currently active URL being used to fetch the feed.
     */
    constructor(logger, apiKey, apiURL, apiURLFallback, processor, buildTripIdMapFn, dayServiceInterval = 60000, nightServiceInterval = 180000, recoveryInterval = 300000) {
        this.logger = logger;
        this.apiKey = apiKey;
        this.apiURL = apiURL;
        this.apiURLFallback = apiURLFallback;
        this.activeURL = apiURL;
        this.processor = processor;
        this.buildTripIdMapFn = buildTripIdMapFn;
        this.dayServiceInterval = dayServiceInterval;
        this.nightServiceInterval = nightServiceInterval;
        this.recoveryInterval = recoveryInterval;
        this.recoveryTimer = null;
        this.feed = null;
        this.feedTripIdMap = null;
        this.started = false;
    }

    /**
     * Starts polling the GTFS-realtime feed at a regular interval.
     *
     * The polling interval is measured from the start of each poll, not the end. This ensures
     * that network delays or slow requests do not cause drift in the polling schedule. If a request
     * takes longer than the interval, the next poll will occur immediately after the previous one completes.
     */
    async start() {
        if (this.started) return;
        this.started = true;
        const poll = async () => {
            const start = Date.now();
            const interval = getCurrentTimestamp() < 21600
                ? this.nightServiceInterval
                : this.dayServiceInterval;
            this.logger.updateFeed();
            await this.sendGetRequest();
            const elapsed = Date.now() - start;
            const nextPollIn = Math.max(0, interval - elapsed);
            setTimeout(poll, nextPollIn);
        };
        poll();
    }

    /**
     * Fetches the GTFS-realtime feed from the configured URL.
     * Implements retry logic and fallback URL handling. If the primary URL fails, it will switch to the fallback URL (if provided) and retry.
     */
    async sendGetRequest() {
        const maxRetries = 3;
        let urls = [this.activeURL];
        // Add either the fallback URL (if configured and different) or the primary URL (if fallback is currently active) to the list of URLs to try
        if (this.activeURL === this.apiURL) {
            if (this.apiURLFallback && this.apiURLFallback !== this.apiURL) {
                urls.push(this.apiURLFallback);
            }
        } else if (this.activeURL === this.apiURLFallback) {
            urls.push(this.apiURL);
        }
        for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
            const url = urls[urlIndex];
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = await axios({
                        method: 'GET',
                        timeout: 15000,
                        url,
                        responseType: 'arraybuffer',
                        headers: {
                            'x-api-key': this.apiKey
                        }
                    });
                    if (response.status === 200) {
                        const buffer = Buffer.from(response.data);
                        const newFeed = await this.decodeFeedMessage(buffer);
                        const newFeedTripIdMap = this.buildTripIdMapFn(newFeed);
                        this.feed = newFeed;
                        this.feedTripIdMap = newFeedTripIdMap;
                        this.logger.success();
                        this.activeURL = url; // Update active URL on successful fetch
                        if (url === this.apiURL && this.recoveryTimer) {
                            clearInterval(this.recoveryTimer);
                            this.recoveryTimer = null;
                        }
                        return;
                    }
                } catch (error) {
                    if (attempt < maxRetries) {
                        this.logger.errorFetchingFeed(error, `Retrying (${attempt}/${maxRetries}) for ${url}`);
                    } else if (urlIndex === 0 && urls.length > 1) {
                        this.logger.errorFetchingFeed(
                            error,
                            `Switching GTFS-realtime feed URL from ${urls[0]} to ${urls[1]}.`
                        );
                        // When the fallback URL is active, this begins a recovery check to see if the primary becomes available again.
                        // Start recovery timer if not already running
                        if (!this.recoveryTimer) {
                            this.startRecoveryCheck();
                        }
                    } else {
                        this.logger.errorFetchingFeed(error, `All retries failed for ${url}`);
                    }
                }
            }
        }
    }

    async decodeFeedMessage(buffer) {
        return gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    }

    startRecoveryCheck() {
        this.recoveryTimer = setInterval(() => {
            (async () => {
                try {
                    const response = await axios({
                        method: 'HEAD',
                        timeout: 5000,
                        url: this.apiURL,
                        responseType: 'arraybuffer',
                        headers: {
                            'x-api-key': this.apiKey
                        }
                    });
                    if (response.status === 200) {
                        this.logger.success('Primary URL recovered, switching back.');
                        this.activeURL = this.apiURL;
                        clearInterval(this.recoveryTimer);
                        this.recoveryTimer = null;
                    }
                } catch (error) {
                    this.logger.errorFetchingFeed(error, 'Primary URL still unavailable during recovery check.');
                }
            })();
        }, this.recoveryInterval);
    }

    getFeedTimestamp() {
        return this.feed?.header?.timestamp?.low;
    }

    getFeedTripIdMap() {
        return this.feedTripIdMap;
    }

    /**
     * Registers and returns a query processor for real-time feed queries.
     *
     * This method binds the current instance's getFeedTimestamp and getFeedTripIdMap methods
     * and passes them to the processor's register method. The returned query processor
     * can be used to process queries with the latest real-time feed data.
     *
     * @param {Object} [logger] - Optional logger instance to pass to the processor.
     * @returns {Promise<Object>} An object containing query processing functions for real-time data.
     */
    async registerQueryProcessor(logger) {
        return await this.processor.register(this.getFeedTimestamp.bind(this), this.getFeedTripIdMap.bind(this), logger);
    }
}
