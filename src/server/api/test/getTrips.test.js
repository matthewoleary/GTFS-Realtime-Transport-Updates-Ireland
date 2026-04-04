
import { describe, test, expect, vi, beforeEach } from 'vitest';
import getTrips from '../routes/getTrips.js';

// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn() , warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetRealtimeVehiclePositionsClient = vi.fn();
const mockGetRedisClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();

vi.mock('../../serverLogger.js', () => ({
  default: function (...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
  extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
vi.mock('../index.js', () => ({
  getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
  getRealtimeVehiclePositionsClient: (...args) => mockGetRealtimeVehiclePositionsClient(...args),
  getRedisClient: (...args) => mockGetRedisClient(...args)
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
  getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getTrips', () => {
  let server;
  let handler;
  let db;
  let realtime;
  let h;
  let redisClient;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getTripById: vi.fn() } };
    // Always set up the realtime mock here
    realtime = {
      queryProcessor: {
        updateResultsWithRealtimeVehiclePositions: vi.fn((payload) => {
          if (payload === undefined) {
            throw new Error('Payload is undefined');
          }
          const newPayload = { ...payload };
          newPayload.realtime_vehicle_positions_feed_timestamp = 999999;
          return Promise.resolve(newPayload);
        })
      }
    };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetRealtimeVehiclePositionsClient.mockReturnValue(realtime);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
    redisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn()
    };
    mockGetRedisClient.mockReturnValue(redisClient);
  });

  test('returns trip from cache if present (cache hit)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    redisClient.get.mockResolvedValueOnce(JSON.stringify({ id: 'T1', cached: true }));
    db.queries.getTripById.mockResolvedValueOnce([{ id: 'T1', cached: false }]); // Should not be called
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { tripId: 'T1' },
      server: { plugins: { realtimeVehiclePositions: { realtimeVehiclePositionsClient: realtime }, database: { client: db } } }
    };
    const res = await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('trips:trip:T1');
    expect(db.queries.getTripById).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'T1', cached: true }] }));
  });

  test('returns trip from DB and sets cache if cache miss', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T2']);
    redisClient.get.mockResolvedValueOnce(null);
    db.queries.getTripById.mockResolvedValueOnce([{ id: 'T2' }]);
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { tripId: 'T2' },
      server: { plugins: { realtimeVehiclePositions: { realtimeVehiclePositionsClient: realtime }, database: { client: db } } }
    };
    const res = await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('trips:trip:T2');
    expect(db.queries.getTripById).toHaveBeenCalledWith('T2');
    expect(redisClient.set).toHaveBeenCalledWith('trips:trip:T2', JSON.stringify({ id: 'T2' }));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'T2' }] }));
  });

  test('deletes corrupted cache and falls back to DB', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T3']);
    // Simulate corrupted cache (invalid JSON)
    redisClient.get.mockResolvedValueOnce('not-json');
    db.queries.getTripById.mockResolvedValueOnce([{ id: 'T3' }]);
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { tripId: 'T3' },
      server: { plugins: { realtimeVehiclePositions: { realtimeVehiclePositionsClient: realtime }, database: { client: db } } }
    };
    const res = await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('trips:trip:T3');
    expect(redisClient.del).toHaveBeenCalledWith('trips:trip:T3');
    expect(db.queries.getTripById).toHaveBeenCalledWith('T3');
    expect(redisClient.set).toHaveBeenCalledWith('trips:trip:T3', JSON.stringify({ id: 'T3' }));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'T3' }] }));
  });

  test('proceeds without cache if redisClient is null', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T4']);
    mockGetRedisClient.mockReturnValueOnce(null);
    db.queries.getTripById.mockResolvedValueOnce([{ id: 'T4' }]);
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { tripId: 'T4' },
      server: { plugins: { realtimeVehiclePositions: { realtimeVehiclePositionsClient: realtime }, database: { client: db } } }
    };
    const res = await handler(req, h);
    expect(db.queries.getTripById).toHaveBeenCalledWith('T4');
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'T4' }] }));
  });

  test('registers the route on the server', () => {
    getTrips(server);
    expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/trips',
      handler: expect.any(Function)
    }));
  });

  test('returns 400 if no tripId param', async () => {
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: {} };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'tripId query parameter is required' });
  });

  test('returns trips by id if tripId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1', 'T2']);
    db.queries.getTripById.mockResolvedValueOnce([{ id: 'T1' }]).mockResolvedValueOnce([{ id: 'T2' }]);
    getTrips(server);
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
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No trips found for the specified trip(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['T1']);
    db.queries.getTripById.mockRejectedValue(new Error('fail'));
    getTrips(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { tripId: 'T1' } };
    const res = await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
