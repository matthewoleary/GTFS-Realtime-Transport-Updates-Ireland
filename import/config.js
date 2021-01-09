const dotenv = require('dotenv');

dotenv.config();

const {
	DOCKER_SQL_USER,
	DOCKER_SQL_PASSWORD,
	DOCKER_SQL_SERVER,
	DOCKER_SQL_DATABASE
} = process.env;

const config = {
	agencies: [
		{
			agency_key: 'transportforireland',
			url: 'https://www.transportforireland.ie/transitData/google_transit_combined.zip',
			exclude: [
			]
		}
	],
	csvOptions: {
		skip_lines_with_error: true
	}
};

const dockerDbConfig = {
	server: DOCKER_SQL_SERVER,
	database: DOCKER_SQL_DATABASE,
	user: DOCKER_SQL_USER,
	password: DOCKER_SQL_PASSWORD,
	requestTimeout: 60000,
	options: {
		enableArithAbort: true,
		validateBulkLoadParameters: true,
		trustServerCertificate: true
	}
};

module.exports = {
	config,
	dockerDbConfig
};
