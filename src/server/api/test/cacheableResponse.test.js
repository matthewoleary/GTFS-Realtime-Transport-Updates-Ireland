import { server as createServer } from '@hapi/hapi';
import { afterEach, describe, expect, test } from 'vitest';
import {
	createCacheableResponse,
	createRevisionValidator
} from '../routes/cacheableResponse.js';

describe('createCacheableResponse', () => {
	let testServer;

	afterEach(async () => {
		if (testServer) {
			await testServer.stop();
		}
	});

	test('returns cache validators and responds with 304 for a matching ETag', async () => {
		const payload = {
			db_last_updated: '2026-06-29T00:00:00.000Z',
			response: [{ agency_id: 'A1' }]
		};
		testServer = createServer();
		testServer.route({
			method: 'GET',
			path: '/',
			handler: (request, handler) => createCacheableResponse(handler, payload)
		});
		await testServer.initialize();

		const initialResponse = await testServer.inject('/');
		const conditionalResponse = await testServer.inject({
			method: 'GET',
			url: '/',
			headers: {
				'if-none-match': initialResponse.headers.etag
			}
		});

		expect(initialResponse.statusCode).toBe(200);
		expect(initialResponse.headers.etag).toMatch(/^"[A-Za-z0-9_-]{43}"$/);
		expect(initialResponse.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
		expect(initialResponse.headers['last-modified']).toBe('Mon, 29 Jun 2026 00:00:00 GMT');
		expect(conditionalResponse.statusCode).toBe(304);
		expect(conditionalResponse.payload).toBe('');
		expect(conditionalResponse.headers.etag).toBe(initialResponse.headers.etag);
		expect(conditionalResponse.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
		expect(conditionalResponse.headers['last-modified']).toBe('Mon, 29 Jun 2026 00:00:00 GMT');
	});

	test('checks a revision validator before creating the response payload', async () => {
		const databaseLastUpdated = '2026-06-29T00:00:00.000Z';
		const validator = createRevisionValidator('stops:all', databaseLastUpdated);
		let payloadLoads = 0;
		testServer = createServer();
		testServer.route({
			method: 'GET',
			path: '/',
			handler: (request, handler) => {
				const notModified = handler.entity(validator);
				if (notModified) {
					return notModified;
				}

				payloadLoads++;
				return createCacheableResponse(handler, {
					db_last_updated: databaseLastUpdated,
					response: [{ stop_id: 'S1', stop_name: 'A'.repeat(2048) }]
				}, validator);
			}
		});
		await testServer.initialize();

		const initialResponse = await testServer.inject({
			method: 'GET',
			url: '/',
			headers: {
				'accept-encoding': 'gzip'
			}
		});
		const conditionalResponse = await testServer.inject({
			method: 'GET',
			url: '/',
			headers: {
				'accept-encoding': 'gzip',
				'if-none-match': initialResponse.headers.etag
			}
		});

		expect(initialResponse.statusCode).toBe(200);
		expect(initialResponse.headers.etag).toMatch(/-gzip"$/);
		expect(conditionalResponse.statusCode).toBe(304);
		expect(payloadLoads).toBe(1);
	});

	test('scopes revision validators to the requested resource', () => {
		const databaseLastUpdated = '2026-06-29T00:00:00.000Z';
		const allStops = createRevisionValidator('stops:all', databaseLastUpdated);
		const agencyStops = createRevisionValidator('stops:agency:A1', databaseLastUpdated);

		expect(allStops.etag).not.toBe(agencyStops.etag);
		expect(allStops.modified).toEqual(new Date(databaseLastUpdated));
	});

	test('does not create a revision validator without a valid database update time', () => {
		expect(createRevisionValidator('stops:all', null)).toBeNull();
		expect(createRevisionValidator('stops:all', 'not-a-date')).toBeNull();
	});

	test('changes the ETag when the response payload changes', async () => {
		let response = [{ agency_id: 'A1' }];
		testServer = createServer();
		testServer.route({
			method: 'GET',
			path: '/',
			handler: (request, handler) => createCacheableResponse(handler, {
				db_last_updated: '2026-06-29T00:00:00.000Z',
				response
			})
		});
		await testServer.initialize();

		const firstResponse = await testServer.inject('/');
		response = [{ agency_id: 'A2' }];
		const secondResponse = await testServer.inject({
			method: 'GET',
			url: '/',
			headers: {
				'if-none-match': firstResponse.headers.etag
			}
		});

		expect(secondResponse.statusCode).toBe(200);
		expect(secondResponse.headers.etag).not.toBe(firstResponse.headers.etag);
	});

	test('omits Last-Modified when the database update time is null', async () => {
		testServer = createServer();
		testServer.route({
			method: 'GET',
			path: '/',
			handler: (request, handler) => createCacheableResponse(handler, {
				db_last_updated: null,
				response: []
			})
		});
		await testServer.initialize();

		const response = await testServer.inject('/');

		expect(response.statusCode).toBe(200);
		expect(response.headers.etag).toBeDefined();
		expect(response.headers['last-modified']).toBeUndefined();
	});
});
