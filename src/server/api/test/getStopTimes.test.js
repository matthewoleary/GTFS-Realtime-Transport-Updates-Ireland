import { describe, test, expect, vi, beforeEach } from 'vitest';
import getStopTimes from '../routes/getStopTimes.js';

// Mocks
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../../serverLogger.js', () => ({
  default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRedisClient: (req) => req?.server?.plugins?.redis?.redisClient
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getStopTimes', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: {
      getStopTimesByTripId: vi.fn()
    } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(55555);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.del.mockClear();
  });

  test('registers the route on the server', () => {
    getStopTimes(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/stopTimes',
      handler: expect.any(Function)
    }));
  });

  test('returns stop times for given tripIds (cache miss)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop: 1 }]).mockResolvedValueOnce([{ stop: 2 }]);
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1,T2' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
    expect(mockRedis.get).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(mockRedis.get).toHaveBeenCalledWith('stopTimes:trip:T2');
    expect(db.queries.getStopTimesByTripId).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 55555,
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 1 }] },
        { tripId: 'T2', stopTimes: [{ stop: 2 }] }
      ]
    }));
  });

  test('returns stop times for given tripIds (cache hit)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    mockRedis.get.mockResolvedValueOnce(JSON.stringify([{ stop: 99 }]));
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1');
    expect(mockRedis.get).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(db.queries.getStopTimesByTripId).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 99 }] }
      ]
    }));
  });

  test('returns 400 if tripId param is missing', async () => {
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'tripId query parameter is required' });
  });

  test('returns 404 if no stop times found', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([]);
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No stop times found for the specified trip(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getStopTimesByTripId.mockRejectedValue(new Error('fail'));
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
