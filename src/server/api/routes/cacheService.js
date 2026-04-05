/**
 * Service for handling Redis caching and DB fallback logic.
 * Encapsulates cache get/set, DB fetch, and unified getOrSetCache pattern.
 */
export class CacheService {
    /**
     * @param {Object} params
     * @param {Object} params.redisClient - Redis client instance
     * @param {Object} params.logger - Logger instance
     */
    constructor({ redisClient, logger }) {
        this.redisClient = redisClient;
        this.logger = logger;
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
        } catch (e) {
            this.logger && this.logger.warn(`Redis error on get for ${cacheKey}: ${e.message}`);
            return null;
        }
        if (!cachedData) return null;
        try {
            this.logger && this.logger.info(`Cache hit for ${cacheKey}`);
            return deserialize(cachedData);
        } catch (err) {
            this.logger && this.logger.warn(`Corrupted cache for ${cacheKey}, treating as cache miss. Error: ${err.message}`);
            try {
                await this.redisClient.del(cacheKey);
            } catch (delErr) {
                this.logger && this.logger.warn(`Redis error on del for ${cacheKey}: ${delErr.message}`);
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
        try {
            await this.redisClient.set(cacheKey, serialize(value));
        } catch (setErr) {
            this.logger && this.logger.warn(`Redis error on set for ${cacheKey}: ${setErr.message}`);
        }
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
}
