import { describe, test, expect, vi, beforeEach } from 'vitest';
import getStopTimes from '../routes/getStopTimes.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockGetRealtimeTripUpdatesClient = vi.fn();
const mockUpdateStopTimesWithRealtimeUpdates = vi.fn();
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
	getRealtimeTripUpdatesClient: (...args) => mockGetRealtimeTripUpdatesClient(...args),
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
		db = {
			lastDbUpdate: '2026-06-29T00:00:00.000Z',
			getLastDbUpdate: vi.fn().mockResolvedValue('2026-06-29T00:00:00.000Z'),
			queries: {
				getStopTimesByTripId: vi.fn()
			}
		};
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(1234567890);
		mockGetRealtimeTripUpdatesClient.mockReturnValue({
			queryProcessor: {
				updateStopTimesWithRealtimeUpdates: mockUpdateStopTimesWithRealtimeUpdates
			}
		});
		mockUpdateStopTimesWithRealtimeUpdates.mockImplementation(async (payload) => payload);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
	});

	test('registers the route on the server', () => {
		getStopTimes(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/trips/{tripId}/stopTimes',
			handler: expect.any(Function)
		}));
	});

	test('returns stop times from cache for a tripId (cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce([{ stop_id: 'stop1' }]);
		mockUpdateStopTimesWithRealtimeUpdates.mockResolvedValueOnce({
			query_timestamp: 1234567890,
			db_last_updated: '2026-06-29T00:00:00.000Z',
			response: [{ stop_id: 'stop1', stopTimeUpdate: { stopId: 'stop1' } }]
		});
		mockGetRealtimeTripUpdatesClient.mockReturnValue({
			queryProcessor: {
				updateStopTimesWithRealtimeUpdates: mockUpdateStopTimesWithRealtimeUpdates
			}
		});
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'stopTimes:trip:T1' }));
		expect(mockUpdateStopTimesWithRealtimeUpdates).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			db_last_updated: '2026-06-29T00:00:00.000Z',
			response: [{ stop_id: 'stop1' }]
		}));
		expect(db.queries.getStopTimesByTripId).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			db_last_updated: '2026-06-29T00:00:00.000Z',
			response: [{ stop_id: 'stop1', stopTimeUpdate: { stopId: 'stop1' } }]
		}));
	});

	test('returns stop times from DB if cacheService is unavailable', async () => {
		server.plugins.cache.cacheService = null;
		db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop_id: 'stop-db' }]);
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'TDB' }, server };
		const res = await handler(req, h);
		expect(db.queries.getStopTimesByTripId).toHaveBeenCalledWith('TDB');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			db_last_updated: '2026-06-29T00:00:00.000Z',
			response: [{ stop_id: 'stop-db' }]
		}));
	});

	test('returns 404 if no stop times found', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce([]);
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T404' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/No stop times/) }));
	});

	test('returns 500 on handler error', async () => {
		mockCacheService.getOrSetCache.mockRejectedValueOnce(new Error('fail'));
		getStopTimes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'TERR' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Internal Server Error/) }));
	});
});
