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

	test('registers the detail route on the server', () => {
		getTrips(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/trips/{tripId}',
			handler: expect.any(Function)
		}));
	});

	test('returns trip by id from cache if present (detail endpoint, cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'T1', foo: 'bar' });
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'trips:trip:T1' }));
		expect(db.queries.getTripById).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'T1', foo: 'bar' }
		}));
		expect(mockRealtime.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
	});


	test('returns trip by id from DB if cacheService is unavailable (detail endpoint)', async () => {
		server.plugins.cache.cacheService = null;
		db.queries.getTripById.mockResolvedValueOnce([{ id: 'TDB', foo: 'db' }]);
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'TDB' }, server };
		const res = await handler(req, h);
		expect(db.queries.getTripById).toHaveBeenCalledWith('TDB');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'TDB', foo: 'db' }
		}));
		expect(mockRealtime.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
	});

	test('returns 404 if no trip found (detail endpoint)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce(null);
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T404' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith({ error: 'Trip with ID T404 not found' });
	});

	test('returns 500 on handler error (detail endpoint)', async () => {
		mockCacheService.getOrSetCache.mockRejectedValueOnce(new Error('fail'));
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'TERR' }, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Internal Server Error/) }));
	});
});
