


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockSortByRouteShortNameAsInt = vi.fn();
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

vi.mock('../../serverLogger.js', () => ({
  default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args),
  sortByRouteShortNameAsInt: (...args) => mockSortByRouteShortNameAsInt(...args)
}));
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn()
};
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRedisClient: () => mockRedisClient
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import getRoutes from '../routes/getRoutes.js';

describe('getRoutes', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getRouteById: vi.fn(), getAllRoutes: vi.fn(), getAllRoutesByAgencyId: vi.fn() } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(67890);
    mockSortByRouteShortNameAsInt.mockImplementation((arr) => arr);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.del.mockReset();
  });

  test('registers the route on the server', () => {
    getRoutes(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/routes',
      handler: expect.any(Function)
    }));
  });

  test('returns all routes if no routeId param and caches result', async () => {
    const routes = [{ id: 1 }, { id: 2 }];
    db.queries.getAllRoutes.mockResolvedValue(routes);
    mockRedisClient.get.mockResolvedValue(null); // cache miss
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:all');
    expect(db.queries.getAllRoutes).toHaveBeenCalled();
    expect(mockRedisClient.set).toHaveBeenCalledWith('routes:all', JSON.stringify(routes));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 67890,
      response: routes
    }));
  });

  test('returns all routes from cache if present', async () => {
    const routes = [{ id: 1 }, { id: 2 }];
    mockRedisClient.get.mockResolvedValue(JSON.stringify(routes));
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:all');
    expect(db.queries.getAllRoutes).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 67890,
      response: routes
    }));
  });

  test('returns routes by id if routeId param is present and caches each', async () => {
    mockExtractIdsFromParam.mockReturnValue(['R1', 'R2']);
    mockRedisClient.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // cache miss for both
    db.queries.getRouteById.mockResolvedValueOnce([{ id: 'R1' }]).mockResolvedValueOnce([{ id: 'R2' }]);
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { routeId: 'R1,R2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('R1,R2');
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:route:R1');
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:route:R2');
    expect(db.queries.getRouteById).toHaveBeenCalledTimes(2);
    expect(mockRedisClient.set).toHaveBeenCalledWith('routes:route:R1', JSON.stringify({ id: 'R1' }));
    expect(mockRedisClient.set).toHaveBeenCalledWith('routes:route:R2', JSON.stringify({ id: 'R2' }));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'R1' }, { id: 'R2' }]
    }));
  });

  test('returns route by id from cache if present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['R1']);
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ id: 'R1' }));
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { routeId: 'R1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:route:R1');
    expect(db.queries.getRouteById).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'R1' }]
    }));
  });
  test('returns all routes for agencyId and caches result', async () => {
    const routes = [{ id: 1 }, { id: 2 }];
    db.queries.getAllRoutesByAgencyId.mockResolvedValue(routes);
    mockRedisClient.get.mockResolvedValue(null); // cache miss
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { agencyId: 'A1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:agency:A1');
    expect(db.queries.getAllRoutesByAgencyId).toHaveBeenCalledWith('A1');
    expect(mockRedisClient.set).toHaveBeenCalledWith('routes:agency:A1', JSON.stringify(routes));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: routes
    }));
  });

  test('returns all routes for agencyId from cache if present', async () => {
    const routes = [{ id: 1 }, { id: 2 }];
    mockRedisClient.get.mockResolvedValue(JSON.stringify(routes));
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { agencyId: 'A1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('routes:agency:A1');
    expect(db.queries.getAllRoutesByAgencyId).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: routes
    }));
  });

  test('returns 500 on error', async () => {
    db.queries.getAllRoutes.mockRejectedValue(new Error('fail'));
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
