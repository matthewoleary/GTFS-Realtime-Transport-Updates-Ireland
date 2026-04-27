import { describe, test, expect, vi, beforeEach } from 'vitest';
import getStopTimes from '../routes/getStopTimes.js';

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

describe('getStopTimes (with CacheService)', () => {
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
		db = { queries: {
			getStopTimesByTripId: vi.fn()
		}};
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(1234567890);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
	});

	test('registers the route on the server', () => {
		getStopTimes(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/stopTimes',
			handler: expect.any(Function)
		}));
	});

	test('returns stop times from cache for a single tripId', async () => {
		mockExtractIdsFromParam.mockReturnValue(['T1']);
		mockCacheService.getOrSetCache.mockResolvedValueOnce([{ stop_id: 'stop1' }]);
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'T1' }, server };
		const res = await handler(req, h);
		expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1');
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stopTimes:trip:T1' }));
		expect(db.queries.getStopTimesByTripId).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			response: [{ tripId: 'T1', stopTimes: [{ stop_id: 'stop1' }] }]
		}));
	});

	test('returns stop times from cache for multiple tripIds', async () => {
		mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
		mockCacheService.getOrSetCache
			.mockResolvedValueOnce([{ stop_id: 'stop1' }])
			.mockResolvedValueOnce([{ stop_id: 'stop2' }]);
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'T1,T2' }, server };
		const res = await handler(req, h);
		expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledTimes(2);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			response: [
				{ tripId: 'T1', stopTimes: [{ stop_id: 'stop1' }] },
				{ tripId: 'T2', stopTimes: [{ stop_id: 'stop2' }] }
			]
		}));
	});

	test('returns stop times from DB if cacheService is unavailable', async () => {
    server.plugins.cache.cacheService = null;
		db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop_id: 'stop-db' }]);
		mockExtractIdsFromParam.mockReturnValue(['TDB']);
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'TDB' }, server };
		const res = await handler(req, h);
		expect(db.queries.getStopTimesByTripId).toHaveBeenCalledWith('TDB');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			response: [{ tripId: 'TDB', stopTimes: [{ stop_id: 'stop-db' }] }]
		}));
	});

	test('returns 400 if tripId is missing', async () => {
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/tripId/) }));
	});

	test('returns 404 if no stop times found', async () => {
		mockExtractIdsFromParam.mockReturnValue(['T404']);
		mockCacheService.getOrSetCache.mockResolvedValueOnce([]);
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'T404' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/No stop times/) }));
	});

	test('returns 500 on handler error', async () => {
		mockExtractIdsFromParam.mockReturnValue(['TERR']);
		mockCacheService.getOrSetCache.mockRejectedValueOnce(new Error('fail'));
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'TERR' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Internal Server Error/) }));
	});
});
