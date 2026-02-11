/* eslint-env mocha */
// Mocha API
import { describe, it } from 'mocha';
// Assertions module - chai
import { use, assert as _assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
// SQL connection config
import { mockConfig } from '../test/mocks';

// The code under test
import dataClient from '..';
import { ConnectionError } from 'mssql';

use(chaiAsPromised);
const assert = _assert;

/**
 * Tests - Data Utils functions:
 */
describe('Data Client functions:', () => {
	describe('client', () => {
		describe('When I initalise client with a config', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(() => {
				client = null;
			});

			it('Returns an object containing queries, getConnection and closePool objects', () => {
				assert.hasAllKeys(client, ['queries', 'getConnection', 'closePool']);
			});
		});
	});

	describe('getConnection', () => {
		describe('When I call getConnection', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('Should return a connected connection pool based on the given config', async () => {
				const response = await client.getConnection();
				assert.equal(response._connected, true);
				assert.deepEqual(response.config.server, mockConfig.server);
				assert.deepEqual(response.config.database, mockConfig.database);
			});
		});

		describe('When I call getConnection with empty config', () => {
			let client;

			const emptyConfig = {
				server: '',
				database: '',
				user: '',
				password: '',
				options: {
					enableArithAbort: true
				}
			};

			before(async () => {
				client = await dataClient('', emptyConfig);
			});

			after(async () => {

			});

			it('Should return an error', async () => {
				assert.isRejected(client.getConnection(), ConnectionError);
			});
		});

		describe('When I have already successfully called getConnection and call getConnection again', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('Should return the already created pool', async () => {
				let connection = await client.getConnection();
				assert.isTrue(connection._connected);
				const pool = connection.pool;
				connection = await client.getConnection();
				assert.deepEqual(pool, connection.pool);
			});
		});

		describe('When I call getConnection with a server name for a server which does not exist', () => {
			let client;

			const badConfig = {
				server: 'hello1234',
				database: '',
				user: '',
				password: '',
				options: {
					enableArithAbort: true
				}
			};

			before(async () => {
				client = await dataClient('', badConfig);
			});

			after(async () => {

			});

			it('Should return a ConnectionError', async () => {
				assert.isRejected(client.getConnection(), ConnectionError);
			});
		});

		describe('When I call getConnection with a database which does not exist', () => {
			let client;

			const badConfig = {
				server: 'localhost',
				database: 'helloDb',
				user: 'sa',
				password: 'MyStrongPassword',
				options: {
					enableArithAbort: true
				}
			};

			before(async () => {
				client = await dataClient('', badConfig);
			});

			after(async () => {

			});

			it('Should return a ConnectionError for login failed', async () => {
				await assert.isRejected(client.getConnection(), ConnectionError);
			});
		});
	});

	describe('closePool', () => {
		describe('When I open a connection using getConnection, then call closePool', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				client = null;
			});

			it('Should return pool set to null and connected set to false', async () => {
				const connection = await client.getConnection();
				assert.isTrue(connection._connected);
				await client.closePool();
				assert.isFalse(connection._connected);
				assert.isNull(connection.pool);
			});
		});

		describe('When I open a connection, then call closePool to close the connection, then call closePool again', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				client = null;
			});

			it('Should throw a TypeError because pool is now null', async () => {
				let connection = await client.getConnection();
				assert.isTrue(connection._connected);
				connection = await client.closePool();
				assert.isUndefined(connection);
				assert.isRejected(client.closePool(), TypeError);
			});
		});
	});
});
