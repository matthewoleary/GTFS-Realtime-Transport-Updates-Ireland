/* eslint-disable no-unused-vars */
'use-strict';

const dotenv = require('dotenv');
const assert = require('assert');

dotenv.config();

const {
	PORT,
	HOST,
	HOST_URL,
	SQL_SERVER,
	SQL_USER,
	SQL_PASSWORD,
	SQL_DATABASE,
	DOCKER_SQL_USER,
	DOCKER_SQL_PASSWORD,
	DOCKER_SQL_SERVER,
	DOCKER_SQL_DATABASE,
	GTFSR_API_KEY,
	GTFSR_API_URL,
	GTFSR_TEST_API_KEY,
	GTFSR_TEST_API_URL
} = process.env;

const sqlEncrypt = process.env.SQL_ENCRYPT === 'true';

assert(PORT, 'PORT is required');
assert(HOST, 'HOST is required');
assert(HOST_URL, 'HOST_URL is required');
assert(DOCKER_SQL_SERVER, 'SQL_SERVER is required');
assert(DOCKER_SQL_USER, 'SQL_USER is required');
assert(DOCKER_SQL_PASSWORD, 'SQL_PASSWORD is required');
assert(DOCKER_SQL_DATABASE, 'SQL_DATABASE is required');
assert(GTFSR_API_KEY, 'GTFSR_API_KEY is required');
assert(GTFSR_API_URL, 'GTFSR_API_URL is required');

const prod = {
	port: PORT,
	host: HOST,
	url: HOST_URL,
	gtfsr: {
		apiKey: GTFSR_API_KEY,
		apiUrl: GTFSR_API_URL
	},
	sql: {
		server: DOCKER_SQL_SERVER,
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
		server: DOCKER_SQL_SERVER,
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

module.exports = {
	prod,
	test
};
