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
	DOCKER_SQL_PORT,
	TEST_PORT,
	TEST_DOCKER_SQL_USER,
	TEST_DOCKER_SQL_PASSWORD,
	TEST_DOCKER_SQL_HOST,
	TEST_DOCKER_SQL_DATABASE,
	TEST_DOCKER_SQL_PORT,
	GTFSR_API_KEY,
	GTFSR_API_TRIP_UPDATES_URL,
	GTFSR_API_TRIP_UPDATES_URL_FALLBACK,
	GTFSR_API_VEHICLE_POSITIONS_URL,
	GTFSR_API_VEHICLE_POSITIONS_URL_FALLBACK
} = process.env;

assert(PORT, 'PORT is required');
assert(HOST, 'HOST is required');
assert(HOST_URL, 'HOST_URL is required');
assert(DOCKER_SQL_HOST, 'DOCKER_SQL_HOST is required');
assert(DOCKER_SQL_USER, 'DOCKER_SQL_USER is required');
assert(DOCKER_SQL_PASSWORD, 'DOCKER_SQL_PASSWORD is required');
assert(DOCKER_SQL_DATABASE, 'DOCKER_SQL_DATABASE is required');
assert(DOCKER_SQL_PORT, 'DOCKER_SQL_PORT is required');
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
		apiTripUpdatesUrlFallback: GTFSR_API_TRIP_UPDATES_URL_FALLBACK,
		apiVehiclePositionsUrl: GTFSR_API_VEHICLE_POSITIONS_URL,
		apiVehiclePositionsUrlFallback: GTFSR_API_VEHICLE_POSITIONS_URL_FALLBACK
	},
	sql: {
		host: DOCKER_SQL_HOST,
		database: DOCKER_SQL_DATABASE,
		user: DOCKER_SQL_USER,
		password: DOCKER_SQL_PASSWORD,
		port: DOCKER_SQL_PORT
	}
};

const test = {
	port: TEST_PORT,
	host: HOST,
	url: HOST_URL,
	gtfsr: {
		apiKey: GTFSR_API_KEY,
		apiTripUpdatesUrl: GTFSR_API_TRIP_UPDATES_URL,
		apiTripUpdatesUrlFallback: GTFSR_API_TRIP_UPDATES_URL_FALLBACK,
		apiVehiclePositionsUrl: GTFSR_API_VEHICLE_POSITIONS_URL,
		apiVehiclePositionsUrlFallback: GTFSR_API_VEHICLE_POSITIONS_URL_FALLBACK
	},
	sql: {
		host: TEST_DOCKER_SQL_HOST,
		database: TEST_DOCKER_SQL_DATABASE,
		user: TEST_DOCKER_SQL_USER,
		password: TEST_DOCKER_SQL_PASSWORD,
		port: TEST_DOCKER_SQL_PORT
	}
};

export default {
	prod,
	test
};
