'use-strict';
const utils = require('../utils');

// Takes a server as an argument and uses that server to register a route
// We get our database plugin by accessing plugins property on server, which registers sql plugin, sql plugin exposes client object
module.exports.register = async server => {
	server.route({
		method: 'GET',
		path: '/api/stops/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const stopId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getStopById(stopId);
				query.response = response.recordset;
				return query; // Returns automatically as JSON
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/stops',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				let agencyId;
				if (request.query.agency !== undefined) {
					agencyId = request.query.agency.toLowerCase();
				}

				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getAllStops(agencyId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/routes/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const routeId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getRouteById(routeId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/routes',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				let agencyId;
				if (request.query.agency !== undefined) {
					agencyId = request.query.agency.toLowerCase();
				}

				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getAllRoutes(agencyId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/agencies/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const agencyId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getAgencyById(agencyId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/shapes/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const shapeId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getShapeById(shapeId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/transfers/from/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const stopId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getTransfersFromStopId(stopId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/transfers/to/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const stopId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getTransfersToStopId(stopId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/trips/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const tripId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getTripById(tripId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/stopTimes/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const tripId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				const response = await db.queries.getStopTimesByTripId(tripId);
				query.response = response.recordset;
				return query;
			} catch (error) {
				console.log(error);
			}
		}
	});

	server.route({
		method: 'GET',
		path: '/api/tripsAtStop/{id}',
		handler: async request => {
			try {
				const db = request.server.plugins.sql.client;
				const realtime = request.server.plugins.realtime.client;
				const stopId = request.params.id;
				const currentTimestamp = utils.getCurrentTimestamp();
				const unixTimestamp = utils.getUnixTimestamp();
				const currentTimestampMinusNumMinutes = await utils.getTimestampMinusNumMinutes(currentTimestamp, 10); // Num minutes set to 10
				const currentTimestampPlusOneHour = utils.getCurrentTimestampPlusOneHour();
				let query;
				let scheduleDay;
				let scheduleDate;

				// If currentTimestampMinusNumMinutes is on or after midnight set schedule day to be day before current day
				if (await utils.checkIfNightServices(currentTimestampMinusNumMinutes)) {
					scheduleDay = utils.getWrappedDay().toLowerCase();
					scheduleDate = utils.getWrappedDate();
				} else {
					scheduleDay = utils.getCurrentDay().toLowerCase();
					scheduleDate = utils.getCurrentDate();
				}

				// Check if currentTimesampPlusOneHour is on or after midnight
				// If true, we get wrapped times and call a getTripsAtStopIdWithNightServices query instead
				// If false call getTripsAtStopId as normal
				if (await utils.checkIfNightServices(currentTimestampPlusOneHour)) {
					query = {
						since_midnight_timestamp: await utils.getWrappedTimestamp(currentTimestamp),
						query_timestamp: unixTimestamp
					};
					return await getTripsWithMidnightServices({ db, stopId, realtime, query, currentTimestampMinusNumMinutes, currentTimestampPlusOneHour, scheduleDate, scheduleDay });
				}

				query = {
					since_midnight_timestamp: currentTimestamp,
					query_timestamp: unixTimestamp
				};
				return await getTrips({ db, stopId, realtime, query, currentTimestampMinusNumMinutes, currentTimestampPlusOneHour, scheduleDate, scheduleDay });
			} catch (error) {
				console.log(error);
			}
		}
	});
};

const getTripsWithMidnightServices = async ({ db, stopId, realtime, query, currentTimestampMinusNumMinutes, currentTimestampPlusOneHour, scheduleDate, scheduleDay }) => {
	const wrappedCurrentTimestampMinusNumMinutes = await utils.getWrappedTimestamp(currentTimestampMinusNumMinutes);
	const wrappedCurrentTimestampPlusOneHour = await utils.getWrappedTimestamp(currentTimestampPlusOneHour);
	const nextDayDate = await utils.checkIfNightServices(currentTimestampMinusNumMinutes) ? utils.getCurrentDate() : utils.getNextDayDate();
	const response = await db.queries.getTripsAtStopIdWithNightServices({ stopId, scheduleDate, nextDayDate, scheduleDay, currentTimestampPlusOneHour, wrappedCurrentTimestampMinusNumMinutes, wrappedCurrentTimestampPlusOneHour });
	const lastStops = await db.queries.getLastStops(response.recordset);
	response.recordset = await utils.removeTripsAtLastStop(lastStops, response.recordset);
	query.response = response.recordset;
	query = await realtime.queries.updateResultsWithRealtime(query);
	return query;
};

const getTrips = async ({ db, stopId, realtime, query, currentTimestampMinusNumMinutes, currentTimestampPlusOneHour, scheduleDate, scheduleDay }) => {
	const response = await db.queries.getTripsAtStopId({ stopId, scheduleDate, scheduleDay, currentTimestampMinusNumMinutes, currentTimestampPlusOneHour });
	const lastStops = await db.queries.getLastStops(response.recordset);
	response.recordset = await utils.removeTripsAtLastStop(lastStops, response.recordset);
	query.response = response.recordset;
	query = await realtime.queries.updateResultsWithRealtime(query);
	return query;
};
