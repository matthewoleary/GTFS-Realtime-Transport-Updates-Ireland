import RealtimeFeedClient from './realtimeFeedClient.js';
import RealtimeLogger from '../realtimeLogger.js';
import processor from '../processors/realtimeVehiclePositionsProcessor.js';

// Mapping function for VehiclePositions feed
function buildFeedVehiclePositionsTripIdMap(feed) {
	const tripIdMap = new Map();
	for (const entity of feed.entity) {
		if (
			entity.vehicle &&
			entity.vehicle.trip &&
			entity.vehicle.trip.tripId
		) {
			tripIdMap.set(entity.vehicle.trip.tripId, entity);
		}
	}
	return tripIdMap;
}

/**
 * Creates and starts a real-time Vehicle Positions client for GTFS-realtime feeds.
 *
 * This function initializes a RealtimeFeedClient for Vehicle Positions, starts polling the feed,
 * and returns an object exposing methods to start the client and process queries with real-time data.
 *
 * @param {Object} server - The Hapi server instance (not used directly here, but may be used for integration).
 * @param {Object} config - Configuration object containing API key and Vehicle Positions feed URL.
 * @param {number} [dayServiceInterval=60000] - Polling interval (ms) for day service.
 * @param {number} [nightServiceInterval=180000] - Polling interval (ms) for night service.
 * @returns {Promise<{start: Function, queryProcessor: Object}>} An object with start and queryProcessor properties.
 */
export async function createRealtimeVehiclePositionsClient(server, config, dayServiceInterval = 60000, nightServiceInterval = 180000) {
	const loggerOptions = {
		client: 'VEHICLE POSITIONS',
		successMessage: 'Successful GTFS-R Vehicle Positions response.',
		updateFeedMessage: 'Updating GTFS-R Vehicle Positions feed.',
		errorFetchingFeedMessage: 'Error fetching GTFS-R Vehicle Positions feed.'
	};
	const logger = new RealtimeLogger(loggerOptions);
	const client = new RealtimeFeedClient(
		logger,
		config.apiKey,
		config.apiVehiclePositionsUrl,
		processor,
		buildFeedVehiclePositionsTripIdMap,
		dayServiceInterval,
		nightServiceInterval
	);
	await client.start();
	return {
		start: client.start.bind(client),
		queryProcessor: await client.registerQueryProcessor(logger)
	};
}