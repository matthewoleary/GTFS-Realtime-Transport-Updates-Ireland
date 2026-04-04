


// Mocks must be defined before any other code

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
import getAgencies from '../routes/getAgencies.js';

describe('getAgencies', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getAgencyById: vi.fn(), getAllAgencies: vi.fn() } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.del.mockReset();
  });

  test('registers the route on the server', () => {
    getAgencies(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/agencies',
      handler: expect.any(Function)
    }));
  });

  test('returns all agencies if no agencyId param and caches result', async () => {
    const agencies = [{ id: 1 }, { id: 2 }, { id: 3}];
    db.queries.getAllAgencies.mockResolvedValue(agencies);
    mockRedisClient.get.mockResolvedValue(null); // cache miss
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('agencies:all');
    expect(db.queries.getAllAgencies).toHaveBeenCalled();
    expect(mockRedisClient.set).toHaveBeenCalledWith('agencies:all', JSON.stringify(agencies));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 67890,
      response: agencies
    }));
  });

  test('returns all agencies from cache if present', async () => {
    const agencies = [{ id: 1 }, { id: 2 }, { id: 3}];
    mockRedisClient.get.mockResolvedValue(JSON.stringify(agencies));
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('agencies:all');
    expect(db.queries.getAllAgencies).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 67890,
      response: agencies
    }));
  });

  test('returns agencies by id if agencyId param is present and caches each', async () => {
    mockExtractIdsFromParam.mockReturnValue(['A1', 'A2']);
    mockRedisClient.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // cache miss for both
    db.queries.getAgencyById.mockResolvedValueOnce([{ id: 'A1' }]).mockResolvedValueOnce([{ id: 'A2' }]);
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { agencyId: 'A1,A2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('A1,A2');
    expect(mockRedisClient.get).toHaveBeenCalledWith('agencies:agency:A1');
    expect(mockRedisClient.get).toHaveBeenCalledWith('agencies:agency:A2');
    expect(db.queries.getAgencyById).toHaveBeenCalledTimes(2);
    expect(mockRedisClient.set).toHaveBeenCalledWith('agencies:agency:A1', JSON.stringify({ id: 'A1' }));
    expect(mockRedisClient.set).toHaveBeenCalledWith('agencies:agency:A2', JSON.stringify({ id: 'A2' }));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'A1' }, { id: 'A2' }]
    }));
  });

  test('returns agency by id from cache if present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['A1']);
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ id: 'A1' }));
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { agencyId: 'A1' } };
    const res = await handler(req, h);
    expect(mockRedisClient.get).toHaveBeenCalledWith('agencies:agency:A1');
    expect(db.queries.getAgencyById).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'A1' }]
    }));
  });

  test('returns 404 if no agencies found', async () => {
    db.queries.getAllAgencies.mockResolvedValue([]);
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    // h.response({ error: ... }).code(404)
    expect(h.response).toHaveBeenCalledWith({ error: 'No agencies found' });
  });

  test('returns 500 on error', async () => {
    db.queries.getAllAgencies.mockRejectedValue(new Error('fail'));
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
