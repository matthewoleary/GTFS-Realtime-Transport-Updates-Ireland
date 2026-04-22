import { describe, test, expect, vi, beforeEach } from 'vitest';
import getTrips from '../routes/getTrips.js';

// Mocks
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetRealtimeVehiclePositionsClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined)
};

const mockRealtime = {
  queryProcessor: {
    updateResultsWithRealtimeVehiclePositions: vi.fn((payload) => payload)
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
  getRealtimeVehiclePositionsClient: (...args) => mockGetRealtimeVehiclePositionsClient(...args),
  getRedisClient: (req) => req?.server?.plugins?.redis?.redisClient
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getTrips', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: {
      getTripById: vi.fn()
    } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetRealtimeVehiclePositionsClient.mockReturnValue(mockRealtime);
    mockGetUnixTimestamp.mockReturnValue(12345);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.del.mockClear();
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

  test('returns trip for given tripIds (cache miss)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
    db.queries.getTripById.mockResolvedValueOnce([{ trip: 1 }]).mockResolvedValueOnce([{ trip: 2 }]);
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1,T2' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
    expect(mockRedis.get).toHaveBeenCalledWith('trips:trip:T1');
    expect(mockRedis.get).toHaveBeenCalledWith('trips:trip:T2');
    expect(db.queries.getTripById).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 12345,
      response: [
        { trip: 1 },
        { trip: 2 }
      ]
    }));
  });

  test('returns trip for given tripIds (cache hit)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ trip: 99 }));
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1');
    expect(mockRedis.get).toHaveBeenCalledWith('trips:trip:T1');
    expect(db.queries.getTripById).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { trip: 99 }
      ]
    }));
  });

  test('returns 400 if tripId param is missing', async () => {
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'tripId query parameter is required' });
  });

  test('returns 404 if no trips found', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getTripById.mockResolvedValueOnce([]);
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No trips found for the specified trip(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getTripById.mockRejectedValue(new Error('fail'));
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
