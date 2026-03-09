import RealtimeFeedClient from './realtimeFeedClient.js';
import RealtimeLogger from '../realtimeLogger.js';
import processor from '../processors/realtimeTripUpdatesProcessor.js';

// Mapping function for TripUpdates feed
export function buildFeedTripIdMap(feed) {
	const tripIdMap = new Map();
	for (const entity of feed.entity) {
		if (
			entity.tripUpdate &&
			entity.tripUpdate.trip &&
			entity.tripUpdate.trip.tripId
		) {
			tripIdMap.set(entity.tripUpdate.trip.tripId, entity);
		}
	}
	return tripIdMap;
}

// Filter feed to only include specific agencies. If no agencies provided, return full feed.
export function filterFeed(feed, agencies = []) {
	if (!feed?.entity) return feed;
	feed.entity = feed.entity.filter(entity => 
		agencies.length === 0 || agencies.some(agency => entity.id.includes(agency))
	);
	return feed;
}

/**
 * Creates and starts a real-time Trip Updates client for GTFS-realtime feeds.
 *
 * This function initializes a RealtimeFeedClient for Trip Updates, starts polling the feed,
 * and returns an object exposing methods to start the client and process queries with real-time data.
 *
 * @param {Object} server - The Hapi server instance (not used directly here, but may be used for integration).
 * @param {Object} config - Configuration object containing API key and Trip Updates feed URL.
 * @param {number} [dayServiceInterval=60000] - Polling interval (ms) for day service.
 * @param {number} [nightServiceInterval=180000] - Polling interval (ms) for night service.
 * @returns {Promise<{start: Function, queryProcessor: Object}>} An object with start and queryProcessor properties.
 */
export async function createRealtimeTripUpdatesClient(server, config, dayServiceInterval = 60000, nightServiceInterval = 180000) {
	const loggerOptions = {
		client: 'TRIP UPDATES',
		successMessage: 'Successful GTFS-R Trip Updates response.',
		updateFeedMessage: 'Updating GTFS-R Trip Updates feed.',
		errorFetchingFeedMessage: 'Error fetching GTFS-R Trip Updates feed.'
	};
	const logger = new RealtimeLogger(loggerOptions);
	const client = new RealtimeFeedClient(
		logger,
		config.apiKey,
		config.apiTripUpdatesUrl,
		config.apiTripUpdatesUrlFallback,
		processor,
		buildFeedTripIdMap,
		dayServiceInterval,
		nightServiceInterval
	);
	await client.start();
	return {
		start: client.start.bind(client),
		queryProcessor: await client.registerQueryProcessor(logger)
	};
}