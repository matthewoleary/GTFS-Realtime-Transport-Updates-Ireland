import { describe, test, expect, vi, beforeEach } from 'vitest';
import getStops from '../routes/getStops.js';

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

describe('getStops', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: {
      getStopById: vi.fn(),
      getAllStops: vi.fn(),
      getAllStopsByAgencyId: vi.fn()
    } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(12345);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.del.mockClear();
  });

  test('registers the route on the server', () => {
    getStops(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/stops',
      handler: expect.any(Function)
    }));
  });

  test('returns all stops if no stopId or agencyId param', async () => {
    const stops = [{ id: 1 }, { id: 2 }];
    db.queries.getAllStops.mockResolvedValue(stops);
    getStops(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockRedis.get).toHaveBeenCalledWith('stops:all');
    expect(db.queries.getAllStops).toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 12345,
      response: stops
    }));
  });

  test('returns stops by id if stopId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1', 'S2']);
    db.queries.getStopById.mockResolvedValueOnce([{ id: 'S1' }]).mockResolvedValueOnce([{ id: 'S2' }]);
    getStops(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { stopId: 'S1,S2' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('S1,S2');
    expect(mockRedis.get).toHaveBeenCalledWith('stops:stop:S1');
    expect(mockRedis.get).toHaveBeenCalledWith('stops:stop:S2');
    expect(db.queries.getStopById).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'S1' }, { id: 'S2' }]
    }));
  });

  test('returns stops by agency if agencyId param is present', async () => {
    const stops = [{ id: 'A1' }, { id: 'A2' }];
    db.queries.getAllStopsByAgencyId.mockResolvedValue(stops);
    getStops(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { agencyId: 'AGENCY1' }, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(mockRedis.get).toHaveBeenCalledWith('stops:agency:AGENCY1');
    expect(db.queries.getAllStopsByAgencyId).toHaveBeenCalledWith('AGENCY1');
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: stops
    }));
  });

  test('returns 500 on error', async () => {
    db.queries.getAllStops.mockRejectedValue(new Error('fail'));
    getStops(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, server: { plugins: { redis: { redisClient: mockRedis } } } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
