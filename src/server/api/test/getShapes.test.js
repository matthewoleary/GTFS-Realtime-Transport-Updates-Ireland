


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
import getShapes from '../routes/getShapes.js';

describe('getShapes', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getShapeById: vi.fn() } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
  });

  test('registers the route on the server', () => {
    getShapes(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/shapes',
      handler: expect.any(Function)
    }));
  });

  test('returns 400 if no shapeId param', async () => {
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'shapeId query parameter is required' });
  });

  test('returns shapes by id if shapeId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1', 'S2']);
    db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S1' }]).mockResolvedValueOnce([{ id: 'S2' }]);
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { shapeId: 'S1,S2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('S1,S2');
    expect(db.queries.getShapeById).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [{ id: 'S1' }, { id: 'S2' }]
    }));
  });

  test('returns 404 if no shapes found', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1']);
    db.queries.getShapeById.mockResolvedValueOnce([]);
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { shapeId: 'S1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No shapes found for the specified shape(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1']);
    db.queries.getShapeById.mockRejectedValue(new Error('fail'));
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { shapeId: 'S1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
