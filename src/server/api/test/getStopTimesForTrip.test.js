
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import getStopTimesForTrip from '../routes/getStopTimesForTrip.js';


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetCurrentTimestamp = vi.fn();
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
  getCurrentTimestamp: (...args) => mockGetCurrentTimestamp(...args),
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getStopTimesForTrip', () => {
  let server;
  let handler;
  let db;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getStopTimesByTripId: vi.fn() } };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetCurrentTimestamp.mockReturnValue(12345);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
  });

  test('registers the route on the server', () => {
    getStopTimesForTrip(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/stopTimes',
      handler: expect.any(Function)
    }));
  });

  test('returns 400 if no tripId param', async () => {
    getStopTimesForTrip(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'tripId query parameter is required' });
  });

  test('returns stop times by trip id if tripId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([{ stop: 1 }]).mockResolvedValueOnce([{ stop: 2 }]);
    getStopTimesForTrip(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1,T2' } };
    const res = await handler(req, h);
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
    expect(db.queries.getStopTimesByTripId).toHaveBeenCalledTimes(2);
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
      response: [
        { tripId: 'T1', stopTimes: [{ stop: 1 }] },
        { tripId: 'T2', stopTimes: [{ stop: 2 }] }
      ]
    }));
  });

  test('returns 404 if no stop times found', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getStopTimesByTripId.mockResolvedValueOnce([]);
    getStopTimesForTrip(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No stop times found for the specified trip(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getStopTimesByTripId.mockRejectedValue(new Error('fail'));
    getStopTimesForTrip(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
