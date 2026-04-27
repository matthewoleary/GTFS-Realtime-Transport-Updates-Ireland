import { describe, test, expect, vi, beforeEach } from 'vitest';
import getTrips from '../routes/getTrips.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockCacheService = { getOrSetCache: vi.fn() };
const mockRealtime = {
	queryProcessor: {
		updateResultsWithRealtimeVehiclePositions: vi.fn(async (payload) => payload)
	}
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
	getRealtimeVehiclePositionsClient: () => mockRealtime
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
	getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getTrips (with CacheService)', () => {
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
		db = { queries: { getTripById: vi.fn() } };
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(11111);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
		mockRealtime.queryProcessor.updateResultsWithRealtimeVehiclePositions.mockClear();
	});

	test('registers the route on the server', () => {
		getTrips(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/trips',
			handler: expect.any(Function)
		}));
	});

	test('returns trip from cache for a single tripId', async () => {
		mockExtractIdsFromParam.mockReturnValue(['T1']);
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'T1', foo: 'bar' });
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'T1' }, server };
		const res = await handler(req, h);
		expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1');
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'trips:trip:T1' }));
		expect(db.queries.getTripById).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 11111,
			response: [{ id: 'T1', foo: 'bar' }]
		}));
		expect(mockRealtime.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
	});

	test('returns trips from cache for multiple tripIds', async () => {
		mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
		mockCacheService.getOrSetCache
			.mockResolvedValueOnce({ id: 'T1', foo: 'bar' })
			.mockResolvedValueOnce({ id: 'T2', foo: 'baz' });
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'T1,T2' }, server };
		const res = await handler(req, h);
		expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledTimes(2);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 11111,
			response: [
				{ id: 'T1', foo: 'bar' },
				{ id: 'T2', foo: 'baz' }
			]
		}));
		expect(mockRealtime.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
	});

	test('returns trip from DB if cacheService is unavailable', async () => {
		server.plugins.cache.cacheService = null;
		db.queries.getTripById.mockResolvedValueOnce([{ id: 'TDB', foo: 'db' }]);
		mockExtractIdsFromParam.mockReturnValue(['TDB']);
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'TDB' }, server };
		const res = await handler(req, h);
		expect(db.queries.getTripById).toHaveBeenCalledWith('TDB');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 11111,
			response: [{ id: 'TDB', foo: 'db' }]
		}));
		expect(mockRealtime.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
	});

	test('returns 400 if tripId is missing', async () => {
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/tripId/) }));
	});

	test('returns 404 if no trips found', async () => {
		mockExtractIdsFromParam.mockReturnValue(['T404']);
		mockCacheService.getOrSetCache.mockResolvedValueOnce(null);
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'T404' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/No trips/) }));
	});

	test('returns 500 on handler error', async () => {
		mockExtractIdsFromParam.mockReturnValue(['TERR']);
		mockCacheService.getOrSetCache.mockRejectedValueOnce(new Error('fail'));
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { tripId: 'TERR' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Internal Server Error/) }));
	});
});
