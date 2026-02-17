// Here we bundle all routes we add to the API into the index.js
import getStopsRoute from './routes/getStops.js';
import getRoutesEndpoint from './routes/getRoutes.js';
import getAgenciesRoute from './routes/getAgencies.js';
import getStopTimesForTripRoute from './routes/getStopTimesForTrip.js';
import getTripsRoute from './routes/getTrips.js';
import getShapesRoute from './routes/getShapes.js';
import getTripsAtStopRoute from './routes/getTripsAtStop.js';

export async function registerRoutes(server) {
	getStopsRoute(server);
	getRoutesEndpoint(server);
	getAgenciesRoute(server);
	getStopTimesForTripRoute(server);
	getTripsRoute(server);
	getShapesRoute(server);
	getTripsAtStopRoute(server);
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
