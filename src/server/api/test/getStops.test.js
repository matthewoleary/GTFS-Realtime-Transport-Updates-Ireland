import { describe, test, expect, vi, beforeEach } from 'vitest';
import getStops from '../routes/getStops.js';

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

describe('getStops (with CacheService)', () => {
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
				getStopById: vi.fn(),
				getAllStops: vi.fn(),
				getAllStopsByAgencyId: vi.fn()
			}
		};
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(88888);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
	});

	test('registers the list and detail routes on the server', () => {
		getStops(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/stops',
			handler: expect.any(Function)
		}));
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/stops/{stopId}',
			handler: expect.any(Function)
		}));
	});

	test('returns stop by id (detail endpoint, cache miss)', async () => {
		db.queries.getStopById.mockResolvedValueOnce([{ id: 'S1' }]);
		mockCacheService.getOrSetCache.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn());
		getStops(server);
		handler = server.route.mock.calls[1][0].handler;
		const req = { params: { stopId: 'S1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stops:stop:S1' }));
		expect(db.queries.getStopById).toHaveBeenCalledWith('S1');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'S1' }
		}));
	});

	test('returns stop by id from cache if present (detail endpoint, cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'S1' });
		getStops(server);
		handler = server.route.mock.calls[1][0].handler;
		const req = { params: { stopId: 'S1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stops:stop:S1' }));
		expect(db.queries.getStopById).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'S1' }
		}));
	});

	test('returns all stops by agencyId if agencyId param is present and caches result (list endpoint, cache miss)', async () => {
		db.queries.getAllStopsByAgencyId.mockResolvedValue([{ id: 'A1' }]);
		mockCacheService.getOrSetCache.mockImplementation(async ({ cacheKey, dbFetchFn }) => {
			expect(cacheKey).toBe('stops:agency:A1');
			return dbFetchFn();
		});
		getStops(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stops:agency:A1' }));
		expect(db.queries.getAllStopsByAgencyId).toHaveBeenCalledWith('A1');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 88888,
			response: [{ id: 'A1' }]
		}));
	});

	test('returns all stops by agencyId from cache if present (cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValue([{ id: 'A1' }]);
		getStops(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { agencyId: 'A1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stops:agency:A1' }));
		expect(db.queries.getAllStopsByAgencyId).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 88888,
			response: [{ id: 'A1' }]
		}));
	});

	test('returns all stops (list endpoint, cache miss)', async () => {
		const stops = [{ id: 1 }, { id: 2 }];
		db.queries.getAllStops.mockResolvedValue(stops);
		mockCacheService.getOrSetCache.mockImplementation(async ({ cacheKey, dbFetchFn }) => {
			expect(cacheKey).toBe('stops:all');
			return dbFetchFn();
		});
		getStops(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stops:all' }));
		expect(db.queries.getAllStops).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 88888,
			response: stops
		}));
	});

	test('returns all stops from cache if present (list endpoint, cache hit)', async () => {
		const stops = [{ id: 1 }, { id: 2 }];
		mockCacheService.getOrSetCache.mockResolvedValue(stops);
		getStops(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stops:all' }));
		expect(db.queries.getAllStops).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 88888,
			response: stops
		}));
	});

	test('returns all stops from DB if cacheService is unavailable (list endpoint)', async () => {
		server.plugins.cache.cacheService = null;
		const stops = [{ id: 1 }];
		db.queries.getAllStops.mockResolvedValue(stops);
		getStops(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(db.queries.getAllStops).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 88888,
			response: stops
		}));
	});

	test('returns 500 on error (list endpoint)', async () => {
		db.queries.getAllStops.mockRejectedValue(new Error('fail'));
		mockCacheService.getOrSetCache.mockImplementation(() => { throw new Error('fail'); });
		getStops(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
	});
});
