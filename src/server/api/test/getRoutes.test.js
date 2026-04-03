


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn() }));
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
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args)
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
    db = { queries: { getRouteById: vi.fn(), getAllRoutes: vi.fn() } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(67890);
    mockSortByRouteShortNameAsInt.mockImplementation((arr) => arr);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
  });

  test('registers the route on the server', () => {
    getRoutes(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/routes',
      handler: expect.any(Function)
    }));
  });

  test('returns all routes if no routeId param', async () => {
    const routes = [{ id: 1 }, { id: 2 }];
    db.queries.getAllRoutes.mockResolvedValue(routes);
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(db.queries.getAllRoutes).toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      since_midnight_timestamp: 12345,
      query_timestamp: 67890,
      response: routes
    }));
  });

  test('returns routes by id if routeId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['R1', 'R2']);
    db.queries.getRouteById.mockResolvedValueOnce([{ id: 'R1' }]).mockResolvedValueOnce([{ id: 'R2' }]);
    getRoutes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { routeId: 'R1,R2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('R1,R2');
    expect(db.queries.getRouteById).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'R1' }, { id: 'R2' }]
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
