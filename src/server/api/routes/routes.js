"use strict";
import getStopsRoute from './getStops.js';
import getRoutesEndpoint from './getRoutes.js';
import getAgenciesRoute from './getAgencies.js';
import getStopTimesForTripRoute from './getStopTimesForTrip.js';
import getTripsRoute from './getTrips.js';
import getShapesRoute from './getShapes.js';
import getTripsAtStopRoute from './getTripsAtStop.js';

// Register all modular route handlers
export async function registerRoutes(server) {
	getStopsRoute(server);
	getRoutesEndpoint(server);
	getAgenciesRoute(server);
	getStopTimesForTripRoute(server);
	getTripsRoute(server);
	getShapesRoute(server);
	getTripsAtStopRoute(server);
}