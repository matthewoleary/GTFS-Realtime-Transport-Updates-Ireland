
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import getStopTimes from '../routes/getStopTimes.js';


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

vi.mock('../../serverLogger.js', () => ({
  default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
const mockGetRedisClient = vi.fn();
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn()
};
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRedisClient: (...args) => mockGetRedisClient(...args)
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
    db = { queries: { getStopTimesByTripId: vi.fn() } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    mockGetRedisClient.mockReturnValue(mockRedisClient);
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.del.mockReset();
  });

  test('registers the route on the server', () => {
    getStopTimes(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/stopTimes',
      handler: expect.any(Function)
    }));
  });

  test('returns 400 if no tripId param', async () => {
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'tripId query parameter is required' });
  });

  test('returns stop times by trip id if tripId param is present and caches result', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
    mockRedisClient.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // cache miss for both
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop: 1 }]).mockResolvedValueOnce([{ stop: 2 }]);
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1,T2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
    expect(mockRedisClient.get).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(mockRedisClient.get).toHaveBeenCalledWith('stopTimes:trip:T2');
    expect(db.queries.getStopTimesByTripId).toHaveBeenCalledTimes(2);
    expect(mockRedisClient.set).toHaveBeenCalledWith('stopTimes:trip:T1', JSON.stringify([{ stop: 1 }]));
    expect(mockRedisClient.set).toHaveBeenCalledWith('stopTimes:trip:T2', JSON.stringify([{ stop: 2 }]));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 1 }] },
        { tripId: 'T2', stopTimes: [{ stop: 2 }] }
      ]
    }));
  });

  test('returns stop times from cache if present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify([{ stop: 1 }]));
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(db.queries.getStopTimesByTripId).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 1 }] }
      ]
    }));
  });

  test('falls back to DB and deletes key if Redis cache is corrupted JSON', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    mockRedisClient.get.mockResolvedValueOnce('not-json');
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop: 1 }]);
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(mockRedisClient.del).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(db.queries.getStopTimesByTripId).toHaveBeenCalledWith('T1');
    expect(mockRedisClient.set).toHaveBeenCalledWith('stopTimes:trip:T1', JSON.stringify([{ stop: 1 }]));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 1 }] }
      ]
    }));
  });

  test('falls back to DB if Redis get throws', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    mockRedisClient.get.mockRejectedValueOnce(new Error('redis fail'));
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop: 1 }]);
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('stopTimes:trip:T1');
    expect(db.queries.getStopTimesByTripId).toHaveBeenCalledWith('T1');
    expect(mockRedisClient.set).toHaveBeenCalledWith('stopTimes:trip:T1', JSON.stringify([{ stop: 1 }]));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 1 }] }
      ]
    }));
  });

  test('returns 404 if no stop times found', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([]);
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No stop times found for the specified trip(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getStopTimesByTripId.mockRejectedValue(new Error('fail'));
    getStopTimes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
