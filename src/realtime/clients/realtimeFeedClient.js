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
     */
    constructor(logger, apiKey, apiURL, apiURLFallback, processor, buildTripIdMapFn, dayServiceInterval = 60000, nightServiceInterval = 180000) {
        this.logger = logger;
        this.apiKey = apiKey;
        this.apiURL = apiURL;
        this.apiURLFallback = apiURLFallback;
        this.processor = processor;
        this.buildTripIdMapFn = buildTripIdMapFn;
        this.dayServiceInterval = dayServiceInterval;
        this.nightServiceInterval = nightServiceInterval;
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
        let urls = [this.apiURL];
        // If a fallback URL is set and it's not the same as the primary,
        // add it to the list of URLs to try after the primary fails.
        if (this.apiURLFallback && this.apiURL !== this.apiURLFallback) {
            urls.push(this.apiURLFallback);
        }
        let lastError = null;
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
                        // If we switched to fallback, update apiURL
                        this.apiURL = url;
                        return;
                    }
                } catch (error) {
                    lastError = error;
                    if (attempt < maxRetries) {
                        this.logger.errorFetchingFeed(error, `Retrying (${attempt}/${maxRetries}) for ${url}`);
                    } else if (urlIndex === 0 && urls.length > 1) {
                        this.logger.errorFetchingFeed(error, 'Switching to backup URL for GTFS-realtime feed.');
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
