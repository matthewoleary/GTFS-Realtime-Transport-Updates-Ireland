


// Mocks must be defined before any other code

// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

vi.mock('../../serverLogger.js', () => ({
  default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args)
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
  });

  test('registers the route on the server', () => {
    getAgencies(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/agencies',
      handler: expect.any(Function)
    }));
  });

  test('returns all agencies if no agencyId param', async () => {
    const agencies = [{ id: 1 }, { id: 2 }, { id: 3}];
    db.queries.getAllAgencies.mockResolvedValue(agencies);
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {}, }; // no agencyId
    const res = await handler(req, h);
    expect(db.queries.getAllAgencies).toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      query_timestamp: 67890,
      response: agencies
    }));
  });

  test('returns agencies by id if agencyId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['A1', 'A2']);
    db.queries.getAgencyById.mockResolvedValueOnce([{ id: 'A1' }]).mockResolvedValueOnce([{ id: 'A2' }]);
    getAgencies(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { agencyId: 'A1,A2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('A1,A2');
    expect(db.queries.getAgencyById).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'A1' }, { id: 'A2' }]
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
