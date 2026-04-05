import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TripsAtStopService } from '../routes/getTripsAtStop.js';

// Mocks for dependencies
const mockGetDatabaseClient = vi.fn();
const mockGetRedisClient = vi.fn();
const mockCacheService = {
  getOrSetCache: vi.fn(),
  getCacheIfAvailable: vi.fn(),
  getFromDb: vi.fn(),
  setCache: vi.fn()
};

vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRedisClient: (...args) => mockGetRedisClient(...args)
}));

vi.mock('../routes/cacheService.js', () => ({
  CacheService: function() { return mockCacheService; }
}));

// Minimal logger mock
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// Minimal db mock
const db = {
  queries: {
    getTripsAtStopId: vi.fn(),
    getTripsAtStopIdWithNightServices: vi.fn(),
    getLastStops: vi.fn(),
    getMaximumDepartureTimestamp: vi.fn()
  }
};

describe('TripsAtStopService', () => {
  let service;

  beforeEach(() => {
    Object.values(mockCacheService).forEach(fn => fn.mockReset && fn.mockReset());
    service = new TripsAtStopService({ dbClient: db, redisClient: undefined, logger });
    service.db = db;
    service.cacheService = mockCacheService;
  });

  test('getTripsAtStopIdWithCache uses cacheService.getOrSetCache', async () => {
    const expected = [{ trip_id: 'T1' }];
    mockCacheService.getOrSetCache.mockResolvedValue(expected);
    const result = await service.getTripsAtStopIdWithCache({ stopId: 'S1', serviceDay: { dayColumn: 'monday', date: '20260405', lowerBoundTimestamp: 100, upperBoundTimestamp: 200 } });
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toBe(expected);
  });

  test('getTripsAtStopIdWithNightServicesWithCache uses cacheService.getOrSetCache', async () => {
    const expected = [{ trip_id: 'T2' }];
    mockCacheService.getOrSetCache.mockResolvedValue(expected);
    const result = await service.getTripsAtStopIdWithNightServicesWithCache({
      stopId: 'S2',
      wrappedServiceDay: { dayColumn: 'monday', date: '20260405', lowerBoundTimestamp: 100, upperBoundTimestamp: 200 },
      unwrappedServiceDay: { dayColumn: 'tuesday', date: '20260406', lowerBoundTimestamp: 0, upperBoundTimestamp: 50 }
    });
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toBe(expected);
  });

  test('getLastStopsWithCache uses cacheService.getOrSetCache', async () => {
    const expected = [{ stop_id: 'S1' }];
    mockCacheService.getOrSetCache.mockResolvedValue(expected);
    const result = await service.getLastStopsWithCache([{ trip_id: 'T1' }]);
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toBe(expected);
  });

  test('getMaximumDepartureTimestampWithCache uses cacheService.getOrSetCache', async () => {
    mockCacheService.getOrSetCache.mockResolvedValue(12345);
    const result = await service.getMaximumDepartureTimestampWithCache({ scheduleDay: 'monday', scheduleDate: '20260405' });
    expect(mockCacheService.getOrSetCache).toHaveBeenCalled();
    expect(result).toBe(12345);
  });
});
