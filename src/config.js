/* eslint-disable no-unused-vars */

import { config } from 'dotenv';
import assert from 'assert';

config();

const {
	PORT,
	HOST,
	HOST_URL,
	DOCKER_SQL_USER,
	DOCKER_SQL_PASSWORD,
	DOCKER_SQL_HOST,
	DOCKER_SQL_DATABASE,
	GTFSR_API_KEY,
	GTFSR_API_TRIP_UPDATES_URL,
	GTFSR_API_VEHICLE_POSITIONS_URL,
	GTFSR_TEST_API_KEY,
	GTFSR_TEST_API_URL
} = process.env;

const sqlEncrypt = process.env.SQL_ENCRYPT === 'true';

assert(PORT, 'PORT is required');
assert(HOST, 'HOST is required');
assert(HOST_URL, 'HOST_URL is required');
assert(DOCKER_SQL_HOST, 'DOCKER_SQL_HOST is required');
assert(DOCKER_SQL_USER, 'DOCKER_SQL_USER is required');
assert(DOCKER_SQL_PASSWORD, 'DOCKER_SQL_PASSWORD is required');
assert(DOCKER_SQL_DATABASE, 'DOCKER_SQL_DATABASE is required');
assert(GTFSR_API_KEY, 'GTFSR_API_KEY is required');
assert(GTFSR_API_TRIP_UPDATES_URL, 'GTFSR_API_TRIP_UPDATES_URL is required');
assert(GTFSR_API_VEHICLE_POSITIONS_URL, 'GTFSR_API_VEHICLE_POSITIONS_URL is required');

const prod = {
	port: PORT,
	host: HOST,
	url: HOST_URL,
	gtfsr: {
		apiKey: GTFSR_API_KEY,
		apiTripUpdatesUrl: GTFSR_API_TRIP_UPDATES_URL,
		apiVehiclePositionsUrl: GTFSR_API_VEHICLE_POSITIONS_URL
	},
	sql: {
		host: DOCKER_SQL_HOST,
		database: DOCKER_SQL_DATABASE,
		user: DOCKER_SQL_USER,
		password: DOCKER_SQL_PASSWORD,
		options: {
			encrypt: sqlEncrypt,
			enableArithAbort: true,
			validateBulkLoadParameters: true,
			trustServerCertificate: true
		}
	}
};

const test = {
	port: PORT,
	host: HOST,
	url: HOST_URL,
	gtfsr: {
		apiKey: GTFSR_TEST_API_KEY,
		apiUrl: GTFSR_TEST_API_URL
	},
	sql: {
		host: DOCKER_SQL_HOST,
		database: DOCKER_SQL_DATABASE,
		user: DOCKER_SQL_USER,
		password: DOCKER_SQL_PASSWORD,
		options: {
			encrypt: sqlEncrypt,
			enableArithAbort: true,
			validateBulkLoadParameters: true,
			trustServerCertificate: true
		}
	}
};

export default {
	prod,
	test
};
