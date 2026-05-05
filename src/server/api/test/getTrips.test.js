import { describe, test, expect, vi, beforeEach } from 'vitest';
import getTrips from '../routes/getTrips.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockGetDatabaseClient = vi.fn();
const mockGetCacheService = vi.fn();
const mockGetRealtimeVehiclePositionsClient = vi.fn();
const mockGetRealtimeTripUpdatesClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

const mockCacheService = { getOrSetCache: vi.fn() };
const mockDb = { queries: { getTripById: vi.fn() } };
const mockRealtimeVehiclePositions = { queryProcessor: { updateResultsWithRealtimeVehiclePositions: vi.fn(async (p) => p) } };
const mockRealtimeTripUpdates = { queryProcessor: { updateResultsWithRealtimeTripUpdates: vi.fn(async (p) => p) } };

vi.mock('../../serverLogger.js', () => ({
	default: function (...args) { return mockLogger(...args); }
}));
vi.mock('../index.js', () => ({
	getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
	getCacheService: (...args) => mockGetCacheService(...args),
	getRealtimeVehiclePositionsClient: (...args) => mockGetRealtimeVehiclePositionsClient(...args),
	getRealtimeTripUpdatesClient: (...args) => mockGetRealtimeTripUpdatesClient(...args)
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
	getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getTrips.js handler', () => {
	let server, handler, h;

	beforeEach(() => {
		server = { route: mockRoute.mockReset() };
		mockGetDatabaseClient.mockReturnValue(mockDb);
		mockGetCacheService.mockReturnValue(mockCacheService);
		mockGetRealtimeVehiclePositionsClient.mockReturnValue(mockRealtimeVehiclePositions);
		mockGetRealtimeTripUpdatesClient.mockReturnValue(mockRealtimeTripUpdates);
		mockGetUnixTimestamp.mockReturnValue(12345);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockDb.queries.getTripById.mockReset();
		mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions.mockClear();
		mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates.mockClear();
	});

	test('registers the route', () => {
		getTrips(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/trips/{tripId}',
			handler: expect.any(Function)
		}));
	});

	test('returns trip from cache (cache hit)', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'T1', foo: 'bar' });
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T1' } };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'T1', foo: 'bar' },
			query_timestamp: 12345
		}));
		expect(mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
		expect(mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates).toHaveBeenCalled();
	});

	test('returns trip from DB if cache unavailable', async () => {
		mockGetCacheService.mockImplementation(() => { throw new Error('no cache'); });
		mockDb.queries.getTripById.mockResolvedValueOnce([{ id: 'T2', foo: 'baz' }]);
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T2' } };
		const res = await handler(req, h);
		expect(mockDb.queries.getTripById).toHaveBeenCalledWith('T2');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			response: { id: 'T2', foo: 'baz' },
			query_timestamp: 12345
		}));
		expect(mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
		expect(mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates).toHaveBeenCalled();
	});

	test('returns 404 if no trip found', async () => {
		mockCacheService.getOrSetCache.mockResolvedValueOnce(null);
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'T404' } };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith({ error: 'Trip with ID T404 not found' });
	});

	test('returns 500 on handler error', async () => {
		mockCacheService.getOrSetCache.mockRejectedValueOnce(new Error('fail'));
		getTrips(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { tripId: 'TERR' } };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Internal Server Error/) }));
	});
});
