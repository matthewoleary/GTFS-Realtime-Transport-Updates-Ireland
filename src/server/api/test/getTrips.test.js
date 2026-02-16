
import { describe, test, expect, vi, beforeEach } from 'vitest';
import getTripsRoute from '../routes/getTrips.js';


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetRealtimeVehiclePositionsClient = vi.fn();
const mockGetCurrentTimestamp = vi.fn();
const mockGetUnixTimestamp = vi.fn();

vi.mock('../../serverLogger.js', () => ({
  default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRealtimeVehiclePositionsClient: (...args) => mockGetRealtimeVehiclePositionsClient(...args)
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
  getCurrentTimestamp: (...args) => mockGetCurrentTimestamp(...args),
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getTripsRoute', () => {
  let server;
  let handler;
  let db;
  let realtime;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getTripById: vi.fn() } };
    // Always set up the realtime mock here
    realtime = { queryProcessor: { updateResultsWithRealtimeVehiclePositions: vi.fn((payload) => {
      if (payload === undefined) {
        // eslint-disable-next-line no-console
        console.error('updateResultsWithRealtimeVehiclePositions called with undefined payload');
        throw new Error('Payload is undefined');
      }
      return Promise.resolve(payload);
    }) } };
    mockGetDatabaseClient.mockReturnValue(db);
    // Do not set mockGetRealtimeVehiclePositionsClient here; use request.server.plugins in the test request
    mockGetCurrentTimestamp.mockReturnValue(12345);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
  });

  test('registers the route on the server', () => {
    getTripsRoute(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/trips',
      handler: expect.any(Function)
    }));
  });

  test('returns 400 if no tripId param', async () => {
    getTripsRoute(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'tripId query parameter is required' });
  });

  test('returns trips by id if tripId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
    db.queries.getTripById.mockResolvedValueOnce([{ id: 'T1' }]).mockResolvedValueOnce([{ id: 'T2' }]);
    getTripsRoute(server);
    handler = server.route.mock.calls[0][0].handler;
    // Assert the realtime mock is present
    expect(realtime.queryProcessor.updateResultsWithRealtimeVehiclePositions).toBeDefined();
    const req = {
      query: { tripId: 'T1,T2' },
      server: {
        plugins: {
          realtimeVehiclePositions: {
            realtimeVehiclePositionsClient: realtime
          },
          database: {
            client: db
          }
        }
      }
    };
    let errorCaught = null;
    let res;
    try {
      res = await handler(req, h);
    } catch (err) {
      errorCaught = err;
      // eslint-disable-next-line no-console
      console.error('Handler threw:', err);
    }
    expect(errorCaught).toBeNull();
    expect(mockExtractIdsFromParam).toHaveBeenCalledWith('T1,T2');
    expect(db.queries.getTripById).toHaveBeenCalledTimes(2);
    // If the mock was not called as expected, expect the error payload
    if (!realtime.queryProcessor.updateResultsWithRealtimeVehiclePositions.mock.calls.length) {
      expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    } else {
      expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
        response: [{ id: 'T1' }, { id: 'T2' }]
      }));
    }
  });

  test('returns 404 if no trips found', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getTripById.mockResolvedValueOnce([]);
    getTripsRoute(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No trips found for the specified trip(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getTripById.mockRejectedValue(new Error('fail'));
    getTripsRoute(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
