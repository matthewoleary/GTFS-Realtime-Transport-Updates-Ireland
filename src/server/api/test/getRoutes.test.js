import { describe, test, expect, vi, beforeEach } from 'vitest';
import getRoutes from '../routes/getRoutes.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockSortByRouteShortNameAsInt = vi.fn(async (arr) => arr);
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockCacheService = {
	getOrSetCache: vi.fn(),
};

vi.mock('../../serverLogger.js', () => ({
	default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
	extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args),
	sortByRouteShortNameAsInt: (...args) => mockSortByRouteShortNameAsInt(...args)
}));
vi.mock('../index.js', () => ({
	getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
	getCacheService: (req) => req?.server?.plugins?.cache?.cacheService,
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
	getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getRoutes (with CacheService)', () => {
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
		db = {
			lastDbUpdate: '2026-06-29T00:00:00.000Z',
			getLastDbUpdate: vi.fn().mockResolvedValue('2026-06-29T00:00:00.000Z'),
			queries: {
				getRouteById: vi.fn(),
				getAllRoutes: vi.fn(),
				getAllRoutesByAgencyId: vi.fn()
			}
		};
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(12345);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
		mockSortByRouteShortNameAsInt.mockClear();
	});

	test('registers the list and detail routes on the server', () => {
		getRoutes(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/routes',
			handler: expect.any(Function)
		}));
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/routes/{routeId}',
			handler: expect.any(Function)
		}));
	});

	test('returns all routes (list endpoint, cache miss)', async () => {
		const routes = [{ id: 1 }, { id: 2 }];
		db.queries.getAllRoutes.mockResolvedValue(routes);
		mockCacheService.getOrSetCache.mockImplementation(async ({ cacheKey, dbFetchFn }) => {
			expect(cacheKey).toBe('routes:all');
			return dbFetchFn();
		});
		getRoutes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({
			cacheKey: 'routes:all',
			dbFetchFn: expect.any(Function),
			serialize: expect.any(Function),
			deserialize: expect.any(Function)
		}));
		expect(db.queries.getAllRoutes).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 12345,
			response: routes
		}));
	});

	test('returns all routes from cache if present (list endpoint, cache hit)', async () => {
		const routes = [{ id: 1 }, { id: 2 }];
		mockCacheService.getOrSetCache.mockResolvedValue(routes);
		getRoutes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'routes:all' }));
		expect(db.queries.getAllRoutes).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 12345,
			response: routes
		}));
	});

	test('returns route by id (detail endpoint, cache miss)', async () => {
		db.queries.getRouteById.mockResolvedValueOnce([{ id: 'R1' }]);
		mockCacheService.getOrSetCache.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn());
		getRoutes(server);
		handler = server.route.mock.calls[1][0].handler;
		const req = { params: { routeId: 'R1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'routes:route:R1' }));
		expect(db.queries.getRouteById).toHaveBeenCalledWith('R1');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'R1' }
		}));
	});

	test('returns route by id from cache if present (detail endpoint, cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'R1' });
		getRoutes(server);
		handler = server.route.mock.calls[1][0].handler;
		const req = { params: { routeId: 'R1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'routes:route:R1' }));
		expect(db.queries.getRouteById).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'R1' }
		}));
	});

	test('returns all routes by agencyId if agencyId param is present and caches result (list endpoint, cache miss)', async () => {
		db.queries.getAllRoutesByAgencyId.mockResolvedValue([{ id: 'A1' }]);
		mockCacheService.getOrSetCache.mockImplementation(async ({ cacheKey, dbFetchFn }) => {
			expect(cacheKey).toBe('routes:agency:A1');
			return dbFetchFn();
		});
		getRoutes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'routes:agency:A1' }));
		expect(db.queries.getAllRoutesByAgencyId).toHaveBeenCalledWith('A1');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: [{ id: 'A1' }]
		}));
	});

	test('returns all routes by agencyId from cache if present (list endpoint, cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValue([{ id: 'A1' }]);
		getRoutes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'routes:agency:A1' }));
		expect(db.queries.getAllRoutesByAgencyId).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: [{ id: 'A1' }]
		}));
	});

	test('returns all routes from DB if cacheService is unavailable (list endpoint)', async () => {
		server.plugins.cache.cacheService = null;
		const routes = [{ id: 1 }];
		db.queries.getAllRoutes.mockResolvedValue(routes);
		getRoutes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(db.queries.getAllRoutes).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 12345,
			response: routes
		}));
	});

	test('returns 500 on error (list endpoint)', async () => {
		db.queries.getAllRoutes.mockRejectedValue(new Error('fail'));
		mockCacheService.getOrSetCache.mockImplementation(() => { throw new Error('fail'); });
		getRoutes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
	});
});
