import { describe, test, expect, vi, beforeEach } from 'vitest';
import getShapes from '../routes/getShapes.js';

const mockRoute = vi.fn();
const mockLogger = vi.fn().mockImplementation(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
const mockExtractIdsFromParam = vi.fn();
const mockGetDatabaseClient = vi.fn();
const mockGetUnixTimestamp = vi.fn();
const mockCacheService = {
	getOrSetCache: vi.fn(),
};

vi.mock('../../serverLogger.js', () => ({
	default: function(...args) { return mockLogger(...args); }
}));
vi.mock('../routes/utils.js', () => ({
	extractIdsFromParam: (...args) => mockExtractIdsFromParam(...args)
}));
vi.mock('../index.js', () => ({
	getDatabaseClient: (...args) => mockGetDatabaseClient(...args),
	getCacheService: (req) => req?.server?.plugins?.cache?.cacheService,
}));
vi.mock('../../../utils/timestampUtils.js', () => ({
	getUnixTimestamp: (...args) => mockGetUnixTimestamp(...args)
}));

describe('getShapes (with CacheService)', () => {
	let server;
	let handler;
	let db;
	let h;

	beforeEach(() => {
		server = {
			route: mockRoute.mockReset(),
			plugins: {
				cache: {
					cacheService: mockCacheService
				}
			}
		};
		db = { queries: { getShapeById: vi.fn() } };
		mockGetDatabaseClient.mockReturnValue(db);
		mockGetUnixTimestamp.mockReturnValue(55555);
		h = { response: vi.fn((payload) => ({ code: vi.fn().mockReturnValue({ payload, code: true }) })) };
		mockCacheService.getOrSetCache.mockReset();
		mockExtractIdsFromParam.mockReset();
	});

	test('registers the route on the server', () => {
		getShapes(server);
		expect(server.route).toHaveBeenCalledWith(expect.objectContaining({
			method: 'GET',
			path: '/api/shapes',
			handler: expect.any(Function)
		}));
	});

	test('returns shape by id if shapeId param is present and caches each (cache miss)', async () => {
		mockExtractIdsFromParam.mockReturnValue(['S1', 'S2']);
		db.queries.getShapeById.mockResolvedValueOnce([{ id: 'S1' }]).mockResolvedValueOnce([{ id: 'S2' }]);
		mockCacheService.getOrSetCache
			.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn())
			.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn());
		getShapes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { shapeId: 'S1,S2' }, server };
		const res = await handler(req, h);
		expect(mockExtractIdsFromParam).toHaveBeenCalledWith('S1,S2');
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'shapes:shape:S1' }));
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'shapes:shape:S2' }));
		expect(db.queries.getShapeById).toHaveBeenCalledTimes(2);
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 55555,
			response: [{ id: 'S1' }, { id: 'S2' }]
		}));
	});

	test('returns shape by id from cache if present (cache hit)', async () => {
		mockExtractIdsFromParam.mockReturnValue(['S1']);
		mockCacheService.getOrSetCache.mockResolvedValueOnce({ id: 'S1' });
		getShapes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { shapeId: 'S1' }, server };
		const res = await handler(req, h);
		expect(mockCacheService.getOrSetCache).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: 'shapes:shape:S1' }));
		expect(db.queries.getShapeById).not.toHaveBeenCalled();
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 55555,
			response: [{ id: 'S1' }]
		}));
	});

	test('returns shape by id from DB if cacheService is unavailable', async () => {
		mockExtractIdsFromParam.mockReturnValue(['S1']);
		server.plugins.cache.cacheService = null;
		db.queries.getShapeById.mockResolvedValue([{ id: 'S1' }]);
		getShapes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { shapeId: 'S1' }, server };
		const res = await handler(req, h);
		expect(db.queries.getShapeById).toHaveBeenCalledWith('S1');
		expect(h.response).toHaveBeenCalledWith(expect.objectContaining({
			query_timestamp: 55555,
			response: [{ id: 'S1' }]
		}));
	});

	test('returns 400 if shapeId param is missing', async () => {
		getShapes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: {}, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'shapeId query parameter is required' });
	});

	test('returns 404 if no shapes found', async () => {
		mockExtractIdsFromParam.mockReturnValue(['S1']);
		db.queries.getShapeById.mockResolvedValueOnce([]);
		mockCacheService.getOrSetCache.mockImplementationOnce(async ({ cacheKey, dbFetchFn }) => dbFetchFn());
		getShapes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { shapeId: 'S1' }, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'No shapes found for the specified shape(s)' });
	});

	test('returns 500 on error', async () => {
		mockExtractIdsFromParam.mockReturnValue(['S1']);
		db.queries.getShapeById.mockRejectedValue(new Error('fail'));
		mockCacheService.getOrSetCache.mockImplementation(() => { throw new Error('fail'); });
		getShapes(server);
		handler = server.route.mock.calls[0][0].handler;
		const req = { query: { shapeId: 'S1' }, server };
		const res = await handler(req, h);
		expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' });
	});
});
