
import fs from 'fs/promises';
import { join } from 'path';
import { lstatSync } from 'fs';
import getTripsAtStopIdQuery from './mysql/trips/getTripsAtStopId/getTripsAtStopIdQuery.js';
import getTripsAtStopIdNightServicesQuery from './mysql/trips/getTripsAtStopId/getTripsAtStopIdNightServicesQuery.js';
import getMaximumDepartureTimestampQuery from './mysql/stopTimes/getMaximumDepartureTimestampQuery.js';

/* eslint-disable new-cap, no-await-in-loop */

const register = async ({ getConnection, loadSqlQueries: injectedLoadSqlQueries }) => {
	if (typeof getConnection !== 'function') {
		throw new Error('getConnection must be provided to register()');
	}
	const sqlQueriesPath = `queries/mysql`;
	const loadSql = injectedLoadSqlQueries || loadSqlQueries;
	const sqlQueries = await loadSql(sqlQueriesPath);

	const getStopById = async stopId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getStopById, [stopId]);
		return rows;
	};

	const getRouteById = async routeId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getRouteById, [routeId]);
		return rows;
	};

	const getAgencyById = async agencyId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getAgencyById, [agencyId]);
		return rows;
	};

	const getShapeById = async shapeId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getShapeById, [shapeId]);
		return rows;
	};

	const getTransfersFromStopId = async stopId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getTransfersFromStopId, [stopId]);
		return rows;
	};

	const getTransfersToStopId = async stopId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getTransfersToStopId, [stopId]);
		return rows;
	};

	const getTripById = async tripId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getTripById, [tripId]);
		return rows;
	};

	const getLastStops = async trips => {
		const cnx = await getConnection();
		const results = [];
		if (trips) {
			for (const trip of trips) {
				const [rows] = await cnx.query(sqlQueries.getLastStopOnTrip, [trip.trip_index]);
				results.push(rows);
			}
		}
		return results;
	};

	const getStopTimesByTripId = async tripId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getStopTimesByTripId, [tripId]);
		return rows;
	};

	const getTripsAtStopId = async ({ stopId, serviceDay }) => {
		const cnx = await getConnection();
		const query = getTripsAtStopIdQuery(serviceDay);
		const [rows] = await cnx.query(query, [stopId]);
		return rows;
	};

	const getTripsAtStopIdWithNightServices = async ({ stopId, wrappedServiceDay, unwrappedServiceDay }) => {
		const cnx = await getConnection();
		const query = getTripsAtStopIdNightServicesQuery(wrappedServiceDay, unwrappedServiceDay);
		const [rows] = await cnx.query(query, [stopId, stopId]);
		return rows;
	};

	const getMaximumDepartureTimestamp = async (dayColumn, dateValue) => {
		const cnx = await getConnection();
		const query = getMaximumDepartureTimestampQuery(dayColumn, dateValue);
		// The query expects four date parameters: start_date, end_date, date (exc. 1), date (exc. 2)
		const [rows] = await cnx.query(query);
		// Returning just the max_departure_timestamp value or null if no rows found.
		return rows[0]?.max_departure_timestamp ?? null;
	};

	const getAllStops = async agencyId => {
		const cnx = await getConnection();
		if (agencyId) {
			const [rows] = await cnx.query(sqlQueries.getAllStopsByAgency, [agencyId]);
			return rows;
		} else {
			const [rows] = await cnx.query(sqlQueries.getAllStops);
			return rows;
		}
	};

	const getAllStopsByAgencyId = async agencyId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getAllStopsByAgencyId, [agencyId]);
		return rows;
	};

	const getAllRoutes = async () => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getAllRoutes);
		return rows;
	};

	const getAllRoutesByAgencyId = async agencyId => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getAllRoutesByAgencyId, [agencyId]);
		return rows;
	};

	const getAllAgencies = async () => {
		const cnx = await getConnection();
		const [rows] = await cnx.query(sqlQueries.getAllAgencies);
		return rows;
	};

	return {
		getAgencyById,
		getAllAgencies,
		getAllRoutes,
		getAllRoutesByAgencyId,
		getAllStops,
		getAllStopsByAgencyId,
		getLastStops,
		getMaximumDepartureTimestamp,
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

// This will read in .sql files when the application loads and return the files as a single object
async function loadSqlQueries(folderName) {
	const filePath = join(process.cwd(), 'src', 'storage', 'database', folderName);
	console.log('Loading SQL queries from', filePath);
	const files = await fs.readdir(filePath);
	const queries = {};
	for (const file of files) {
		const fullPath = join(filePath, file);
		if (isDir(fullPath)) {
			const subDirFiles = await fs.readdir(fullPath);
			for (const subDirFile of subDirFiles) {
				if (subDirFile.endsWith('.sql')) {
					await readQueries(fullPath, subDirFile, queries);
				}
			}
		} else if (file.endsWith('.sql')) {
			await readQueries(filePath, file, queries);
		}
	}
	return queries;
}

function isDir(path) {
	try {
		const stat = lstatSync(path);
		return stat.isDirectory();
	} catch {
		return false;
	}
}

// Reads a .sql file asynchronously and stores its content in the queries object, using the filename (without the .sql extension) as the key.
async function readQueries(dirPath, file, queries) {
	const query = await fs.readFile(join(dirPath, file), { encoding: 'utf-8' });
	queries[file.replace('.sql', '')] = query;
}

export default register;
