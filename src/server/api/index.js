// Here we bundle all routes we add to the API into the index.js
import getStops from './routes/getStops.js';
import getRoutes from './routes/getRoutes.js';
import getAgencies from './routes/getAgencies.js';
import getStopTimes from './routes/getStopTimes.js';
import getTrips from './routes/getTrips.js';
import getShapes from './routes/getShapes.js';
import getTripsAtStop from './routes/getTripsAtStop.js';

export async function registerRoutes(server) {
	getStops(server);
	getRoutes(server);
	getTripsAtStop(server);
	getAgencies(server);
	getStopTimes(server);
	getTrips(server);
	getShapes(server);
}

/**
 * Retrieves the SQL database client from the Hapi request object.
 * @param {object} request - Hapi request object.
 * @returns {object} The SQL database client instance.
 */
export function getDatabaseClient(request) {
	return request.server.plugins.database.client;
}

/**
 * Retrieves the Redis client from the Hapi request object.
 * @param {object} request - Hapi request object.
 * @returns {object} The Redis client instance.
 */
export function getRedisClient(request) {
	return request.server.plugins.redis.redisClient;
}

/**
 * Retrieves the Cache service instance from the Hapi request object.
 * @param {object} request - Hapi request object.
 * @returns {object} The Cache service instance.
 */
export function getCacheService(request) {
	return request.server.plugins.cache.cacheService;
}

/**
 * Retrieves the realtime client from the Hapi request object.
 * @param {object} request - Hapi request object.
 * @returns {object|null} The realtime client or null if not available.
 */
export function getRealtimeTripUpdatesClient(request) {
	return request.server.plugins.realtimeTripUpdates.realtimeTripUpdatesClient || null;
}

/**
 * Retrieves the realtime vehicle positions client from the Hapi request object.
 * @param {object} request - Hapi request object.
 * @returns {object|null} The realtime vehicle positions client or null if not available.
 */
export function getRealtimeVehiclePositionsClient(request) {
	return request.server.plugins.realtimeVehiclePositions.realtimeVehiclePositionsClient || null;
}
