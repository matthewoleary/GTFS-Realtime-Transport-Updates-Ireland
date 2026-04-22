


// Declare mocks before vi.mock
const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
}));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
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
  getRedisClient: (...args) => mockGetRedisClient(...args)
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
  let redisClient;
  let h;

  beforeEach(() => {
    server = { route: mockRoute.mockReset() };
    db = { queries: { getShapeById: vi.fn() } };
    redisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn()
    };
    mockGetDatabaseClient.mockReturnValue(db);
    mockGetRedisClient.mockReturnValue(redisClient);
    mockGetUnixTimestamp.mockReturnValue(67890);
    h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
  });

  test('falls back to DB if redisClient.get throws (Redis outage)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S4']);
    // Simulate Redis get throwing
    redisClient.get.mockRejectedValueOnce(new Error('Redis unavailable'));
    db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S4' }]);
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { shapeId: 'S4' },
      server: {
        plugins: {
          redis: { redisClient },
          database: { client: db }
        }
      }
    };
    await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('shapes:shape:S4');
    expect(db.queries.getShapeById).toHaveBeenCalledWith('S4');
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'S4' }] }));
    // Optionally, check that logger.warn was called for Redis error
    const loggerInstance = mockLogger.mock.results[0].value;
    expect(loggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Redis error on get for shapes:shape:S4'));
  });

  test('returns shape from cache if present (cache hit)', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1']);
    redisClient.get.mockResolvedValueOnce(JSON.stringify({ id: 'S1', cached: true }));
    db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S1', cached: false }]); // Should not be called
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { shapeId: 'S1' },
      server: {
        plugins: {
          redis: { redisClient },
          database: { client: db }
        }
      }
    };
    await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('shapes:shape:S1');
    expect(db.queries.getShapeById).not.toHaveBeenCalled();
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'S1', cached: true }] }));
  });

  test('returns shape from DB and sets cache if cache miss', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S2']);
    redisClient.get.mockResolvedValueOnce(null);
    db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S2' }]);
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { shapeId: 'S2' },
      server: {
        plugins: {
          redis: { redisClient },
          database: { client: db }
        }
      }
    };
    await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('shapes:shape:S2');
    expect(db.queries.getShapeById).toHaveBeenCalledWith('S2');
    expect(redisClient.set).toHaveBeenCalledWith('shapes:shape:S2', JSON.stringify({ id: 'S2' }));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'S2' }] }));
  });

  test('deletes corrupted cache and falls back to DB', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S3']);
    redisClient.get.mockResolvedValueOnce('not-json');
    db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S3' }]);
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { shapeId: 'S3' },
      server: {
        plugins: {
          redis: { redisClient },
          database: { client: db }
        }
      }
    };
    await handler(req, h);
    expect(redisClient.get).toHaveBeenCalledWith('shapes:shape:S3');
    expect(redisClient.del).toHaveBeenCalledWith('shapes:shape:S3');
    expect(db.queries.getShapeById).toHaveBeenCalledWith('S3');
    expect(redisClient.set).toHaveBeenCalledWith('shapes:shape:S3', JSON.stringify({ id: 'S3' }));
    expect(h.response).toHaveBeenCalledWith(expect.objectContaining({ response: [{ id: 'S3' }] }));
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
    await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'shapeId query parameter is required' });
  });

  test('returns shapes by id if shapeId param is present', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1', 'S2']);
    db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S1' }]).mockResolvedValueOnce([{ id: 'S2' }]);
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = {
      query: { shapeId: 'S1,S2' },
      server: {
        plugins: {
          redis: { redisClient },
          database: { client: db }
        }
      }
    };
    await handler(req, h);
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
    const req = {
      query: { shapeId: 'S1' },
      server: {
        plugins: {
          redis: { redisClient },
          database: { client: db }
        }
      }
    };
    await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'No shapes found for the specified shape(s)' });
  });

  test('returns 500 on error', async () => {
    mockExtractIdsFromParam.mockReturnValue(['S1']);
    db.queries.getShapeById.mockRejectedValue(new Error('fail'));
    getShapes(server);
    handler = server.route.mock.calls[0][0].handler;
    const req = { query: { shapeId: 'S1' } };
    await handler(req, h);
    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
