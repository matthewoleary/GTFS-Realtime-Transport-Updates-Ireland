
import database from './database.js';
import cache from './cache.js';
import realtimeTripUpdates from './realtimeTripUpdates.js';
import realtimeVehiclePositions from './realtimeVehiclePositions.js';

export async function register(server) {
	await server.register(database);
	await server.register(cache);
	await server.register(realtimeTripUpdates);
	await server.register(realtimeVehiclePositions);
}
