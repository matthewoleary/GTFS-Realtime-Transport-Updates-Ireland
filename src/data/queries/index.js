'use-strict';

const utils = require('../utils');

/* eslint-disable new-cap, no-await-in-loop */
const register = async ({ sql, getConnection }) => {
	const sqlQueries = await utils.loadSqlQueries('queries');

	const getStopById = async stopId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('stopId', sql.VarChar(50), stopId);
		return request.query(sqlQueries.getStopById);
	};

	const getRouteById = async routeId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('routeId', sql.VarChar(50), routeId);
		return request.query(sqlQueries.getRouteById);
	};

	const getAgencyById = async agencyId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('agencyId', sql.VarChar(50), agencyId);
		return request.query(sqlQueries.getAgencyById);
	};

	const getShapeById = async shapeId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('shapeId', sql.VarChar(50), shapeId);
		return request.query(sqlQueries.getShapeById);
	};

	const getTransfersFromStopId = async stopId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('stopId', sql.VarChar(50), stopId);
		return request.query(sqlQueries.getTransfersFromStopId);
	};

	const getTransfersToStopId = async stopId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('stopId', sql.VarChar(50), stopId);
		return request.query(sqlQueries.getTransfersToStopId);
	};

	const getTripById = async tripId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('tripId', sql.VarChar(50), tripId);
		return request.query(sqlQueries.getTripById);
	};

	const getLastStops = async trips => {
		const cnx = await getConnection();
		const results = [];
		if (trips) {
			for (const trip of trips) {
				const request = await cnx.request();
				request.input('trip_index', sql.Int, trip.trip_index);
				results.push(await request.query(sqlQueries.getLastStopOnTrip));
			}
		}

		return results;
	};

	const getStopTimesByTripId = async tripId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('tripId', sql.VarChar(50), tripId);
		return request.query(sqlQueries.getStopTimesByTripId);
	};

	const getTripsAtStopId = async ({ stopId, scheduleDate, scheduleDay, currentTimestampMinusNumMinutes, currentTimestampPlusOneHour }) => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('stopId', sql.VarChar(50), stopId);
		request.input('currentDate', sql.Int, scheduleDate);
		request.input('currentDay', sql.VarChar(50), scheduleDay);
		request.input('currentTimestampMinusNumMinutes', sql.Int, currentTimestampMinusNumMinutes);
		request.input('currentTimestampPlusOneHour', sql.Int, currentTimestampPlusOneHour);
		return request.query(sqlQueries[scheduleDay]);
	};

	const getTripsAtStopIdWithNightServices = async ({ stopId, scheduleDate, nextDayDate, scheduleDay, currentTimestampPlusOneHour, wrappedCurrentTimestampMinusNumMinutes, wrappedCurrentTimestampPlusOneHour }) => {
		const cnx = await getConnection();
		const request = await cnx.request();
		request.input('stopId', sql.VarChar(50), stopId);
		request.input('currentDate', sql.Int, scheduleDate);
		request.input('nextDayDate', sql.Int, nextDayDate);
		request.input('currentDay', sql.VarChar(50), scheduleDay);
		request.input('currentTimestampPlusOneHour', sql.Int, currentTimestampPlusOneHour);
		request.input('wrappedCurrentTimestampMinusNumMinutes', sql.Int, wrappedCurrentTimestampMinusNumMinutes);
		request.input('wrappedCurrentTimestampPlusOneHour', sql.Int, wrappedCurrentTimestampPlusOneHour);
		const query = sqlQueries[scheduleDay + 'Night'];
		return request.query(query);
	};

	const getAllStops = async agencyId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		if (agencyId) {
			switch (agencyId) {
				case '978':
					return request.query(sqlQueries.getAllDBStops);
				case '03':
				case '03c':
					return request.query(sqlQueries.getAllGDStops);
				case '01':
					return request.query(sqlQueries.getAllBStops);
				default:
					return request.query(sqlQueries.getAllStops);
			}
		} else {
			return request.query(sqlQueries.getAllStops);
		}
	};

	const getAllRoutes = async agencyId => {
		const cnx = await getConnection();
		const request = await cnx.request();
		if (agencyId) {
			switch (agencyId) {
				case '978':
					return request.query(sqlQueries.getAllDBRoutes);
				case '03':
				case '03c':
					return request.query(sqlQueries.getAllGDRoutes);
				case '01':
					return request.query(sqlQueries.getAllBRoutes);
				default:
					return request.query(sqlQueries.getAllRoutes);
			}
		} else {
			return request.query(sqlQueries.getAllRoutes);
		}
	};

	return {
		getAgencyById,
		getAllRoutes,
		getAllStops,
		getLastStops,
		getRouteById,
		getShapeById,
		getStopById,
		getStopTimesByTripId,
		getTransfersFromStopId,
		getTransfersToStopId,
		getTripsAtStopId,
		getTripsAtStopIdWithNightServices,
		getTripById
	};
};
/* eslint-enable new-cap */

module.exports = { register };
