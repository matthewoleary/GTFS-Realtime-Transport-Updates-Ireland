// Here we bundle all routes we add to the API into the index.js
import getStops from './routes/getStops.js';
import getRoutes from './routes/getRoutes.js';
import getTripsAtStopRoute from './routes/getTripsAtStop.js';
import getAgencies from './routes/getAgencies.js';
import getStopTimesForTrip from './routes/getStopTimesForTrip.js';
import getTrips from './routes/getTrips.js';
import getShapes from './routes/getShapes.js';

export async function registerRoutes(server) {
	getStops(server);
	getRoutes(server);
	getTripsAtStopRoute(server);
	getAgencies(server);
	getStopTimesForTrip(server);
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
