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
     * @param {string} apiKey - API key for GTFS-realtime feed
     * @param {string} apiURL - URL for GTFS-realtime feed
     * @param {Object} processor - Processor module for processing the query object.
     * @param {Function} buildTripIdMapFn - Function to build tripId map from feed
     * @param {number} [dayServiceInterval] - Polling interval for day service
     * @param {number} [nightServiceInterval] - Polling interval for night service
     * @param {Function} [logger] - Optional logging function (string => void)
     */
    constructor(logger, apiKey, apiURL, processor, buildTripIdMapFn, dayServiceInterval = 60000, nightServiceInterval = 180000) {
        this.logger = logger;
        this.apiKey = apiKey;
        this.apiURL = apiURL;
        this.processor = processor;
        this.buildTripIdMapFn = buildTripIdMapFn;
        this.dayServiceInterval = dayServiceInterval;
        this.nightServiceInterval = nightServiceInterval;
        this.feed = null;
        this.feedTripIdMap = null;
        this.started = false;
    }

    async start() {
        if (this.started) return;
        this.started = true;
        const poll = async () => {
            const interval = getCurrentTimestamp() < 21600
                ? this.nightServiceInterval
                : this.dayServiceInterval;   
            this.logger.updateFeed();
            await this.sendGetRequest();
            setTimeout(poll, interval);
        };
        poll();
    }

    /**
     * Fetches the GTFS-realtime feed from the configured or provided URL.
     * @param {string} [url] - Optional override for the feed URL. Defaults to this.apiURL.
     */
    async sendGetRequest() {
        try {
            const response = await axios({
                method: 'GET',
                timeout: 15000,
                url: this.apiURL,
                responseType: 'arraybuffer',
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            if (response.status === 200) {
                const buffer = Buffer.from(response.data);
                this.feed = await this.decodeFeedMessage(buffer);
                this.feedTripIdMap = this.buildTripIdMapFn(this.feed);
                this.logger.success();
            }
        } catch (error) {
            this.logger.errorFetchingFeed();
        }
    }

    async decodeFeedMessage(buffer) {
        return gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    }

    async getFeedTimestamp() {
        return this.feed?.header?.timestamp?.low;
    }

    async getFeedTripIdMap() {
        return this.feedTripIdMap;
    }

    /**
     * Registers and returns a query processor for real-time feed queries.
     *
     * This method binds the current instance's getFeedTimestamp and getFeedTripIdMap methods
     * and passes them to the processor's register method. The returned query processor
     * can be used to process queries with the latest real-time feed data.
     *
     * @returns {Promise<Object>} An object containing query processing functions for real-time data.
     */
    async registerQueryProcessor() {
        return await this.processor.register(this.getFeedTimestamp.bind(this), this.getFeedTripIdMap.bind(this));
    }
}
