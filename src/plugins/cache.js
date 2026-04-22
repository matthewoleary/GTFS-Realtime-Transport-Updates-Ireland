
import redisClient from '../storage/cache/redisClient.js';
import { CacheService } from '../services/cache/cacheService.js';

// When hapi registers plugins it passes the server instance to every plugin
export default {
    name: 'cache',
    version: '1.0.0',
    register: async (server) => {
        const config = server.app.config.redis;
        let redisClientInstance;
        let cacheServiceInstance;
        try {
            redisClientInstance = await redisClient(config);
            cacheServiceInstance = new CacheService(redisClientInstance);
            server.expose('cacheService', cacheServiceInstance);
        } catch (error) {
            server.log(['warn', 'cache'], `Cache connection failed: ${error.message}. Caching will be disabled, but API will still serve DB-backed responses.`);
            server.expose('cacheService', null);
        }
    }
};
