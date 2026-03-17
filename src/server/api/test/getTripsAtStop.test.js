
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import getTripsAtStop from '../routes/getTripsAtStop.js';


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockRemoveTripsAtLastStop = vi.fn();
const mockBuildServiceDay = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetRealtimeTripUpdatesClient = vi.fn();
const mockGetRealtimeVehiclePositionsClient = vi.fn();
const mockGetCurrentTimestamp = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockGetTimestampMinusNumberMinutes = vi.fn();
const mockGetTimestampPlusNumberMinutes = vi.fn();
const mockGetUnwrappedTimestamp = vi.fn();

vi.mock('../../serverLogger.js', () => ({
  default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args),
  removeTripsAtLastStop: (...args) => mockRemoveTripsAtLastStop(...args),
  buildServiceDay: (...args) => mockBuildServiceDay(...args)
}));
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRealtimeTripUpdatesClient: (...args) => mockGetRealtimeTripUpdatesClient(...args),
  getRealtimeVehiclePositionsClient: (...args) => mockGetRealtimeVehiclePositionsClient(...args)
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
  getCurrentTimestamp: (...args) => mockGetCurrentTimestamp(...args),
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args),
  getTimestampMinusNumberMinutes: (...args) => mockGetTimestampMinusNumberMinutes(...args),
  getTimestampPlusNumberMinutes: (...args) => mockGetTimestampPlusNumberMinutes(...args),
  getUnwrappedTimestamp: (...args) => mockGetUnwrappedTimestamp(...args)
}));

describe('getTripsAtStop', () => {
  let server;
  let handler;
  let db;
  let realtimeTripUpdates;
  let realtimeVehiclePositions;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: {} };
    realtimeTripUpdates = {};
    realtimeVehiclePositions = {};
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetRealtimeTripUpdatesClient.mockReturnValue(realtimeTripUpdates);
    mockGetRealtimeVehiclePositionsClient.mockReturnValue(realtimeVehiclePositions);
    mockGetCurrentTimestamp.mockReturnValue(12345);
    mockGetUnixTimestamp.mockReturnValue(67890);
    mockGetTimestampMinusNumberMinutes.mockReturnValue(10000);
    mockGetTimestampPlusNumberMinutes.mockReturnValue(15000);
    mockGetUnwrappedTimestamp.mockReturnValue(15000);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
  });

  test('registers the route on the server', () => {
    getTripsAtStop(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/tripsAtStop',
      handler: expect.any(Function)
    }));
  });

  test('returns 400 if no stopId param', async () => {
    getTripsAtStop(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'stopId query parameter is required' });
  });

  test('returns 500 if realtimeTripUpdates is missing', async () => {
    mockGetRealtimeTripUpdatesClient.mockReturnValue(undefined);
    getTripsAtStop(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { stopId: 'S1' } };
    const result = await handler(req, h);
    expect(result.payload).toEqual({ error: 'Internal Server Error' });
  });

  test('returns 500 if db is missing', async () => {
    mockGetDatabaseClient.mockReturnValue(undefined);
    getTripsAtStop(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { stopId: 'S1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
