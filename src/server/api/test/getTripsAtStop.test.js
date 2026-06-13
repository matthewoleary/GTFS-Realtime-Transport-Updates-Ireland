import { describe, test, expect, vi, beforeEach } from 'vitest';
import getTripsAtStop from '../routes/getTripsAtStop.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetCacheService = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockGetSecondsSinceMidnightTimestamp = vi.fn();
const mockGetTimestampMinusNumberMinutes = vi.fn();
const mockGetTimestampPlusNumberMinutes = vi.fn();
const mockGetUnwrappedTimestamp = vi.fn();
const mockCheckIfNightServices = vi.fn();
const mockGetCurrentDay = vi.fn();
const mockGetCurrentDate = vi.fn();
const mockGetPreviousDay = vi.fn();
const mockGetPreviousDate = vi.fn();
const mockGetNextDay = vi.fn();
const mockGetNextDayDate = vi.fn();
const mockBuildServiceDay = vi.fn();
const mockRemoveTripsAtLastStop = vi.fn(async (lastStops, trips) => trips);
const mockRealtimeTripUpdates = { queryProcessor: { updateResultsWithRealtimeTripUpdates: vi.fn(async (payload) => payload) } };
const mockRealtimeVehiclePositions = { queryProcessor: { updateResultsWithRealtimeVehiclePositions: vi.fn(async (payload) => payload) } };
const mockCacheService = { getOrSetCache: vi.fn() };
const mockDb = { queries: {
	getTripsAtStopId: vi.fn(),
	getTripsAtStopIdWithNightServices: vi.fn(),
	getLastStops: vi.fn(),
	getMaximumDepartureTimestamp: vi.fn()
}};

vi.mock('../../serverLogger.js', () => ({
	default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
	extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args),
	removeTripsAtLastStop: (...args) => mockRemoveTripsAtLastStop(...args),
	buildServiceDay: (...args) => mockBuildServiceDay(...args)
}));
vi.mock('../index.js', () => ({
	getDatabaseClient: () => mockDb,
	getCacheService: () => mockCacheService,
	getRealtimeTripUpdatesClient: () => mockRealtimeTripUpdates,
	getRealtimeVehiclePositionsClient: () => mockRealtimeVehiclePositions
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
	getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args),
	getSecondsSinceMidnightTimestamp: (...args) => mockGetSecondsSinceMidnightTimestamp(...args),
	getTimestampMinusNumberMinutes: (...args) => mockGetTimestampMinusNumberMinutes(...args),
	getTimestampPlusNumberMinutes: (...args) => mockGetTimestampPlusNumberMinutes(...args),
	checkIfNightServices: (...args) => mockCheckIfNightServices(...args),
	getUnwrappedTimestamp: (...args) => mockGetUnwrappedTimestamp(...args)
}));
vi.mock('../../../utils/dateUtils.js', () => ({
	getCurrentDay: (...args) => mockGetCurrentDay(...args),
	getCurrentDate: (...args) => mockGetCurrentDate(...args),
	getPreviousDay: (...args) => mockGetPreviousDay(...args),
	getPreviousDate: (...args) => mockGetPreviousDate(...args),
	getNextDay: (...args) => mockGetNextDay(...args),
	getNextDayDate: (...args) => mockGetNextDayDate(...args)
}));

describe('getTripsAtStop (with CacheService)', () => {
	let server;
	let handler;
	let h;

	beforeEach(() => {
		server = { route: mockRoute.mockReset() };
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockExtractIdsFromParam.mockReset();
		mockRemoveTripsAtLastStop.mockReset();
		mockRemoveTripsAtLastStop.mockImplementation(async (lastStops, trips) => trips);
		mockCacheService.getOrSetCache.mockReset();
		mockDb.queries.getTripsAtStopId.mockReset();
		mockDb.queries.getTripsAtStopIdWithNightServices.mockReset();
		mockDb.queries.getLastStops.mockReset();
		mockDb.queries.getMaximumDepartureTimestamp.mockReset();
		mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates.mockClear();
		mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions.mockClear();
		mockGetUnixTimestamp.mockReturnValue(1234567890);
		mockGetSecondsSinceMidnightTimestamp.mockReturnValue(1000);
		mockGetTimestampMinusNumberMinutes.mockReturnValue(900);
		mockGetTimestampPlusNumberMinutes.mockReturnValue(1100);
		mockGetUnwrappedTimestamp.mockReturnValue(1100);
		mockCheckIfNightServices.mockReturnValue(false);
		mockGetCurrentDay.mockReturnValue('Monday');
		mockGetCurrentDate.mockReturnValue('20260427');
		mockBuildServiceDay.mockReturnValue({ dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 });
	});

	test('registers the route on the server', () => {
		getTripsAtStop(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/stops/{stopId}/trips',
			handler: expect.any(Function)
		}));
	});

	test('returns trips at stop for a stopId (cache hit)', async () => {
		// First call: max departure timestamp, Second call: trips at stop
		mockCacheService.getOrSetCache
			.mockResolvedValueOnce(86400) // max departure timestamp
			.mockResolvedValueOnce([{ trip_id: 'T1' }]); // trips at stop
		mockDb.queries.getLastStops.mockResolvedValueOnce([{ trip_id: 'T1', last_stop: false }]);
		getTripsAtStop(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { stopId: 'S1' }, query: {}, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			response: [{ trip_id: 'T1' }]
		}));
		expect(mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates).toHaveBeenCalled();
		expect(mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
	});

	test('filters out trips that are at their last stop', async () => {
		mockRemoveTripsAtLastStop.mockImplementation(async (lastStops, trips) => trips.filter((trip, index) => {
			const lastStop = lastStops[index]?.[0];
			return !(lastStop && lastStop.stop_sequence === trip.stop_sequence);
		}));
		mockCacheService.getOrSetCache
			.mockResolvedValueOnce(86400)
			.mockResolvedValueOnce([
				{ trip_id: 'T1', stop_sequence: 3 },
				{ trip_id: 'T2', stop_sequence: 2 }
			])
			.mockResolvedValueOnce([[{ stop_sequence: 3 }], [{ stop_sequence: 2 }]]);
		getTripsAtStop(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { stopId: 'S1' }, query: {}, server };
		await handler(req, h);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 1234567890,
			response: [{ trip_id: 'T2', stop_sequence: 2 }]
		}));
	});

	test('returns 500 on handler error', async () => {
		mockDb.queries.getTripsAtStopId.mockImplementation(() => { throw new Error('fail'); });
		getTripsAtStop(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { params: { stopId: 'S1' }, query: {}, server };
		const res = await handler(req, h);
		expect(res.code).toBe(true);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Internal Server Error/) }));
	});
});
