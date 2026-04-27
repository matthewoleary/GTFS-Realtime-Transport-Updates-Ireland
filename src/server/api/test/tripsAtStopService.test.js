import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TripsAtStopService } from '../routes/getTripsAtStop.js';

const mockCacheService = {
  getOrSetCache: vi.fn(),
};
const mockDb = {
  queries: {
    getTripsAtStopId: vi.fn(),
    getTripsAtStopIdWithNightServices: vi.fn(),
    getLastStops: vi.fn(),
    getMaximumDepartureTimestamp: vi.fn(),
  },
};
const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
const mockRemoveTripsAtLastStop = vi.fn(async (lastStops, trips) => trips);
const mockRealtimeTripUpdates = { queryProcessor: { updateResultsWithRealtimeTripUpdates: vi.fn(async (payload) => payload) } };
const mockRealtimeVehiclePositions = { queryProcessor: { updateResultsWithRealtimeVehiclePositions: vi.fn(async (payload) => payload) } };

vi.mock('../routes/utils.js', () => ({
  removeTripsAtLastStop: (...args) => mockRemoveTripsAtLastStop(...args),
}));

describe('TripsAtStopService', () => {
  let service;
  beforeEach(() => {
    mockCacheService.getOrSetCache.mockReset();
    Object.values(mockDb.queries).forEach(fn => fn.mockReset && fn.mockReset());
    service = new TripsAtStopService({ cacheService: mockCacheService, dbClient: mockDb, logger: mockLogger });
  });

  test('getTripsAtStopIdWithCache uses cacheService', async () => {
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T1' }]);
    const result = await service.getTripsAtStopIdWithCache({ stopId: 'S1', serviceDay: { dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 } });
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toEqual([{ trip_id: 'T1' }]);
  });

  test('getTripsAtStopIdWithNightServicesWithCache uses cacheService', async () => {
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T2' }]);
    const result = await service.getTripsAtStopIdWithNightServicesWithCache({
      stopId: 'S2',
      wrappedServiceDay: { dayColumn: 'sunday', date: '20260426', lowerBoundTimestamp: 800, upperBoundTimestamp: 900 },
      unwrappedServiceDay: { dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 },
    });
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toEqual([{ trip_id: 'T2' }]);
  });

  test('getLastStopsWithCache uses cacheService', async () => {
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T1', last_stop: true }]);
    const result = await service.getLastStopsWithCache([{ trip_id: 'T1' }]);
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toEqual([{ trip_id: 'T1', last_stop: true }]);
  });

  test('getMaximumDepartureTimestampWithCache uses cacheService', async () => {
    mockCacheService.getOrSetCache.mockResolvedValueOnce(1100);
    const result = await service.getMaximumDepartureTimestampWithCache({ scheduleDay: 'monday', scheduleDate: '20260427' });
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toBe(1100);
  });

  test('getTrips calls cacheService and updates payload', async () => {
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T1' }]);
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T1', last_stop: false }]);
    const payload = { response: [] };
    await service.getTrips({
      stopIds: ['S1'],
      realtimeTripUpdates: mockRealtimeTripUpdates,
      realtimeVehiclePositions: mockRealtimeVehiclePositions,
      payload,
      serviceDay: { dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 },
    });
    expect(payload.response).toEqual([{ trip_id: 'T1' }]);
    expect(mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates).toHaveBeenCalled();
    expect(mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
  });

  test('getTripsWithMidnightServices calls cacheService and updates payload', async () => {
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T2' }]);
    mockCacheService.getOrSetCache.mockResolvedValueOnce([{ trip_id: 'T2', last_stop: false }]);
    const payload = { response: [] };
    await service.getTripsWithMidnightServices({
      stopIds: ['S2'],
      realtimeTripUpdates: mockRealtimeTripUpdates,
      realtimeVehiclePositions: mockRealtimeVehiclePositions,
      payload,
      wrappedServiceDay: { dayColumn: 'sunday', date: '20260426', lowerBoundTimestamp: 800, upperBoundTimestamp: 900 },
      unwrappedServiceDay: { dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 },
    });
    expect(payload.response).toEqual([{ trip_id: 'T2' }]);
    expect(mockRealtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates).toHaveBeenCalled();
    expect(mockRealtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalled();
  });

  describe('no cacheService (fallback to DB)', () => {
    let dbOnlyService;
    beforeEach(() => {
      dbOnlyService = new TripsAtStopService({ cacheService: null, dbClient: mockDb, logger: mockLogger });
    });

    test('getTripsAtStopIdWithCache uses DB directly', async () => {
      mockDb.queries.getTripsAtStopId.mockResolvedValueOnce([{ trip_id: 'T1' }]);
      const result = await dbOnlyService.getTripsAtStopIdWithCache({ stopId: 'S1', serviceDay: { dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 } });
      expect(mockDb.queries.getTripsAtStopId).toHaveBeenCalled();
      expect(result).toEqual([{ trip_id: 'T1' }]);
    });

    test('getTripsAtStopIdWithNightServicesWithCache uses DB directly', async () => {
      mockDb.queries.getTripsAtStopIdWithNightServices.mockResolvedValueOnce([{ trip_id: 'T2' }]);
      const result = await dbOnlyService.getTripsAtStopIdWithNightServicesWithCache({
        stopId: 'S2',
        wrappedServiceDay: { dayColumn: 'sunday', date: '20260426', lowerBoundTimestamp: 800, upperBoundTimestamp: 900 },
        unwrappedServiceDay: { dayColumn: 'monday', date: '20260427', lowerBoundTimestamp: 900, upperBoundTimestamp: 1100 },
      });
      expect(mockDb.queries.getTripsAtStopIdWithNightServices).toHaveBeenCalled();
      expect(result).toEqual([{ trip_id: 'T2' }]);
    });

    test('getLastStopsWithCache uses DB directly', async () => {
      mockDb.queries.getLastStops.mockResolvedValueOnce([{ trip_id: 'T1', last_stop: true }]);
      const result = await dbOnlyService.getLastStopsWithCache([{ trip_id: 'T1' }]);
      expect(mockDb.queries.getLastStops).toHaveBeenCalled();
      expect(result).toEqual([{ trip_id: 'T1', last_stop: true }]);
    });

    test('getMaximumDepartureTimestampWithCache uses DB directly', async () => {
      mockDb.queries.getMaximumDepartureTimestamp.mockResolvedValueOnce(1100);
      const result = await dbOnlyService.getMaximumDepartureTimestampWithCache({ scheduleDay: 'monday', scheduleDate: '20260427' });
      expect(mockDb.queries.getMaximumDepartureTimestamp).toHaveBeenCalled();
      expect(result).toBe(1100);
    });
  });
});
