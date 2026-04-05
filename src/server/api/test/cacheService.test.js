
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../routes/cacheService.js';

function createMockRedisClient() {
    return {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    };
}

function createMockLogger() {
    return {
        info: vi.fn(),
        warn: vi.fn(),
    };
}

describe('CacheService', () => {
    let redisClient, logger, cacheService;
    const cacheKey = 'test-key';
    const value = { foo: 'bar' };
    const serialized = JSON.stringify(value);

    beforeEach(() => {
        redisClient = createMockRedisClient();
        logger = createMockLogger();
        cacheService = new CacheService({ redisClient, logger });
        vi.clearAllMocks();
    });

    describe('getCacheIfAvailable', () => {
        it('returns null if no redisClient', async () => {
            const cs = new CacheService({ redisClient: null, logger });
            const result = await cs.getCacheIfAvailable(cacheKey, JSON.parse);
            expect(result).toBeNull();
        });

        it('returns null if redis get throws', async () => {
            redisClient.get.mockRejectedValue(new Error('fail'));
            const result = await cacheService.getCacheIfAvailable(cacheKey, JSON.parse);
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Redis error on get'));
        });

        it('returns null if no cached data', async () => {
            redisClient.get.mockResolvedValue(null);
            const result = await cacheService.getCacheIfAvailable(cacheKey, JSON.parse);
            expect(result).toBeNull();
        });

        it('returns deserialized value on cache hit', async () => {
            redisClient.get.mockResolvedValue(serialized);
            const result = await cacheService.getCacheIfAvailable(cacheKey, JSON.parse);
            expect(result).toEqual(value);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Cache hit'));
        });

        it('returns null and deletes corrupt cache if deserialize fails', async () => {
            redisClient.get.mockResolvedValue('not-json');
            redisClient.del.mockResolvedValue(1);
            const result = await cacheService.getCacheIfAvailable(cacheKey, JSON.parse);
            expect(result).toBeNull();
            expect(redisClient.del).toHaveBeenCalledWith(cacheKey);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Corrupted cache'));
        });

        it('logs error if delete fails after corrupt cache', async () => {
            redisClient.get.mockResolvedValue('not-json');
            redisClient.del.mockRejectedValue(new Error('del fail'));
            await cacheService.getCacheIfAvailable(cacheKey, JSON.parse);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Redis error on del'));
        });
    });

    describe('getFromDb', () => {
        it('calls dbFetchFn and logs', async () => {
            const dbFetchFn = vi.fn().mockResolvedValue('db-value');
            const result = await cacheService.getFromDb(cacheKey, dbFetchFn);
            expect(result).toBe('db-value');
            expect(dbFetchFn).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Cache miss'));
        });
    });

    describe('setCache', () => {
        it('does nothing if no redisClient', async () => {
            const cs = new CacheService({ redisClient: null, logger });
            await cs.setCache(cacheKey, value, JSON.stringify);
            // Should not throw
        });

        it('does nothing if value is undefined or null', async () => {
            await cacheService.setCache(cacheKey, undefined, JSON.stringify);
            await cacheService.setCache(cacheKey, null, JSON.stringify);
            expect(redisClient.set).not.toHaveBeenCalled();
        });

        it('sets cache with serialized value', async () => {
            redisClient.set.mockResolvedValue('OK');
            await cacheService.setCache(cacheKey, value, JSON.stringify);
            expect(redisClient.set).toHaveBeenCalledWith(cacheKey, serialized);
        });

        it('logs error if set fails', async () => {
            redisClient.set.mockRejectedValue(new Error('set fail'));
            await cacheService.setCache(cacheKey, value, JSON.stringify);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Redis error on set'));
        });
    });

    describe('getOrSetCache', () => {
        it('returns cached value if available', async () => {
            vi.spyOn(cacheService, 'getCacheIfAvailable').mockResolvedValue(value);
            const dbFetchFn = vi.fn();
            const result = await cacheService.getOrSetCache({ cacheKey, dbFetchFn });
            expect(result).toEqual(value);
            expect(dbFetchFn).not.toHaveBeenCalled();
        });

        it('fetches from DB and sets cache if cache miss', async () => {
            vi.spyOn(cacheService, 'getCacheIfAvailable').mockResolvedValue(null);
            const dbFetchFn = vi.fn().mockResolvedValue(value);
            vi.spyOn(cacheService, 'setCache').mockResolvedValue();
            const result = await cacheService.getOrSetCache({ cacheKey, dbFetchFn });
            expect(result).toEqual(value);
            expect(dbFetchFn).toHaveBeenCalled();
            expect(cacheService.setCache).toHaveBeenCalledWith(cacheKey, value, expect.any(Function));
        });

        it('uses custom serialize/deserialize', async () => {
            const serialize = vi.fn((v) => `s:${v.foo}`);
            const deserialize = vi.fn((s) => ({ foo: s.slice(2) }));
            vi.spyOn(cacheService, 'getCacheIfAvailable').mockResolvedValue(null);
            const dbFetchFn = vi.fn().mockResolvedValue(value);
            // Do not spy on setCache so we can check the real call
            redisClient.set.mockResolvedValue('OK');
            const result = await cacheService.getOrSetCache({ cacheKey, dbFetchFn, serialize, deserialize });
            expect(result).toEqual(value);
            expect(serialize).toHaveBeenCalledWith(value);
            expect(redisClient.set).toHaveBeenCalledWith(cacheKey, 's:bar');
        });
    });
});
