'use-strict';

import database from './database.js';
import realtimeTripUpdates from './realtimeTripUpdates.js';
import realtimeVehiclePositions from './realtimeVehiclePositions.js';

export async function register(server) {
	await server.register(database);
	await server.register(realtimeTripUpdates);
	await server.register(realtimeVehiclePositions);
}
