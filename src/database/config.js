import { config as _config } from 'dotenv';

_config();

const {
	DOCKER_SQL_USER,
	DOCKER_SQL_PASSWORD,
	DOCKER_SQL_HOST,
	DOCKER_SQL_DATABASE,
	DOCKER_SQL_PORT,
	TEST_DOCKER_SQL_USER,
	TEST_DOCKER_SQL_PASSWORD,
	TEST_DOCKER_SQL_DATABASE,
	TEST_DOCKER_SQL_HOST,
	TEST_DOCKER_SQL_PORT,
	DB_TYPE,
	GTFS_SCHEDULE_URL,
	GTFS_AGENCY_KEY
} = process.env;

export const gtfsImportConfig = {
	agencies: [
		{
			agency_key: GTFS_AGENCY_KEY,
			url: GTFS_SCHEDULE_URL,
			exclude: []
		}
	],
	csvOptions: {
		skip_lines_with_error: true
	}
};

export const dockerDbConfig = {
	type: DB_TYPE,
	host: DOCKER_SQL_HOST,
	database: DOCKER_SQL_DATABASE,
	user: DOCKER_SQL_USER,
	password: DOCKER_SQL_PASSWORD,
	port: DOCKER_SQL_PORT,
	requestTimeout: 60000
};

export const testDbConfig = {
	type: DB_TYPE,
	host: TEST_DOCKER_SQL_HOST,
	database: TEST_DOCKER_SQL_DATABASE,
	user: TEST_DOCKER_SQL_USER,
	password: TEST_DOCKER_SQL_PASSWORD,
	port: TEST_DOCKER_SQL_PORT,
	requestTimeout: 60000
};
