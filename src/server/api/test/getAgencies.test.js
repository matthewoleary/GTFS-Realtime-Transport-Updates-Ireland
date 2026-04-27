// Unit tests for getAgencies route (CacheService abstraction)
import { describe, test, expect, vi, beforeEach } from 'vitest';
import getAgencies from '../routes/getAgencies.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockCacheService = {
	getOrSetCache: vi.fn(),
};

vi.mock('../../serverLogger.js', () => ({
	default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
	extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
vi.mock('../index.js', () => ({
	getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
	getCacheService: (req) => req?.server?.plugins?.cache?.cacheService,
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
	getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getAgencies (with CacheService)', () => {
	let server;
	let handler;
	let db;
	let h;

	beforeEach(() => {
		server = {
			route: mockRoute.mockReset(),
			plugins: {
				cache: {
					cacheService: mockCacheService
				}
			}
		};
		db = { queries: { getAgencyById: vi.fn(), getAllAgencies: vi.fn() } };
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(67890);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
	});

	test('registers the route on the server', () => {
		getAgencies(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/agencies',
			handler: expect.any(Function)
		}));
	});

	test('returns all agencies if no agencyId param and caches result (cache miss)', async () => {
		const agencies = [{ id: 1 }, { id: 2 }];
		db.queries.getAllAgencies.mockResolvedValue(agencies);
		mockCacheService.getOrSetCache.mockImplementation(async ({ cacheKey, dbFetchFn }) => {
			expect(cacheKey).toBe('agencies:all');
			return dbFetchFn(); // simulate cache miss
		});
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({
			cacheKey: 'agencies:all',
			dbFetchFn: expect.any(Function),
			serialize: expect.any(Function),
			deserialize: expect.any(Function)
		}));
		expect(db.queries.getAllAgencies).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 67890,
			response: agencies
		}));
	});

	test('returns all agencies from cache if present (cache hit)', async () => {
		const agencies = [{ id: 1 }, { id: 2 }];
		mockCacheService.getOrSetCache.mockResolvedValue(agencies);
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'agencies:all' }));
		expect(db.queries.getAllAgencies).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 67890,
			response: agencies
		}));
	});

	test('returns agencies by id if agencyId param is present and caches each (cache miss)', async () => {
		mockExtractIdsFromParam.mockReturnValue(['A1', 'A2']);
		db.queries.getAgencyById.mockResolvedValueOnce([{ id: 'A1' }]).mockResolvedValueOnce([{ id: 'A2' }]);
		mockCacheService.getOrSetCache
			.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn())
			.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn());
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1,A2' }, server };
		const res = await handler(req, h);
		expect(mockExtractIdsFromParam).toHaveBeenCalledWith('A1,A2');
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'agencies:agency:A1' }));
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'agencies:agency:A2' }));
		expect(db.queries.getAgencyById).toHaveBeenCalledTimes(2);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: [{ id: 'A1' }, { id: 'A2' }]
		}));
	});

	test('returns agency by id from cache if present (cache hit)', async () => {
		mockExtractIdsFromParam.mockReturnValue(['A1']);
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'A1' });
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'agencies:agency:A1' }));
		expect(db.queries.getAgencyById).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: [{ id: 'A1' }]
		}));
	});

	test('returns agency by id from DB if cacheService is unavailable', async () => {
		// Remove cacheService from server.plugins.cache
    mockExtractIdsFromParam.mockReturnValue(['A1']);
		server.plugins.cache.cacheService = null;
		db.queries.getAgencyById.mockResolvedValue([{ id: 'A1' }]);
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1' }, server };
		const res = await handler(req, h);
		expect(db.queries.getAgencyById).toHaveBeenCalledWith('A1');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: [{ id: 'A1' }]
		}));
	});

	test('returns all agencies from DB if cacheService is unavailable', async () => {
		// Remove cacheService from server.plugins.cache
		server.plugins.cache.cacheService = null;
		const agencies = [{ id: 1 }];
		db.queries.getAllAgencies.mockResolvedValue(agencies);
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(db.queries.getAllAgencies).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 67890,
			response: agencies
		}));
	});

	test('returns 404 if no agencies found', async () => {
		db.queries.getAllAgencies.mockResolvedValue([]);
		mockCacheService.getOrSetCache.mockResolvedValue([]);
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'No agencies found' });
	});

	test('returns 500 on error', async () => {
		db.queries.getAllAgencies.mockRejectedValue(new Error('fail'));
		mockCacheService.getOrSetCache.mockImplementation(() => { throw new Error('fail'); });
		getAgencies(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
	});
});
