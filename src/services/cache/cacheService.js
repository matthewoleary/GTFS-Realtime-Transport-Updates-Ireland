import CacheServiceLogger from './cacheServiceLogger.js';

/**
 * Service for handling Redis caching and DB fallback logic.
 * Encapsulates cache get/set, DB fetch, and unified getOrSetCache pattern.
 */
export class CacheService {
    /**
     * @param {Object} redisClient - Redis client instance
     */
    constructor(redisClient) {
        this.redisClient = redisClient;
        this.logger = new CacheServiceLogger();
    }

    /**
     * Try to get a value from cache, or return null if not available/corrupt.
     * @param {string} cacheKey
     * @param {Function} deserialize
     * @returns {Promise<*>}
     */
    async getCacheIfAvailable(cacheKey, deserialize) {
        if (!this.redisClient) return null;
        let cachedData;
        try {
            cachedData = await this.redisClient.get(cacheKey);
        } catch (error) {
            this.logger && this.logger.warn(`Redis error on get for ${cacheKey}: ${error.message}`);
            return null;
        }
        if (!cachedData) return null;
        try {
            this.logger && this.logger.info(`Cache hit for ${cacheKey}`);
            return deserialize(cachedData);
        } catch (error) {
            this.logger && this.logger.warn(`Corrupted cache for ${cacheKey}, treating as cache miss. Error: ${error.message}`);
            try {
                await this.redisClient.del(cacheKey);
            } catch (delError) {
                this.logger && this.logger.warn(`Redis error on del for ${cacheKey}: ${delError.message}`);
            }
            return null;
        }
    }

    /**
     * Fetch from DB and log cache miss.
     * @param {string} cacheKey
     * @param {Function} dbFetchFn
     * @returns {Promise<*>}
     */
    async getFromDb(cacheKey, dbFetchFn) {
        this.logger && this.logger.info(`Cache miss for ${cacheKey}, querying database`);
        return dbFetchFn();
    }

    /**
     * Set a value in cache.
     * @param {string} cacheKey
     * @param {*} value
     * @param {Function} serialize
     * @returns {Promise<void>}
     */
    async setCache(cacheKey, value, serialize) {
        if (!this.redisClient || value === undefined || value === null) return;
        await this.redisClient.set(cacheKey, serialize(value));
    }

    /**
     * Get from cache or DB, and set cache if needed.
     * @param {Object} params
     * @param {string} params.cacheKey
     * @param {Function} params.dbFetchFn
     * @param {Function} [params.serialize=JSON.stringify]
     * @param {Function} [params.deserialize=JSON.parse]
     * @returns {Promise<*>}
     */
    async getOrSetCache({ cacheKey, dbFetchFn, serialize = JSON.stringify, deserialize = JSON.parse }) {
        const cached = await this.getCacheIfAvailable(cacheKey, deserialize);
        if (cached !== null && cached !== undefined) {
            return cached;
        }
        const dbFetchResult = await this.getFromDb(cacheKey, dbFetchFn);
        await this.setCache(cacheKey, dbFetchResult, serialize);
        return dbFetchResult;
    }

    /**
     * Flush the entire cache.
     */
    async flushCache() {
        if (!this.redisClient) return;
        await this.redisClient.flush();
    }
}
