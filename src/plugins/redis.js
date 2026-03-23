
import redisClient from '../database/redisClient.js';

// When hapi registers plugins it passes the server instance to every plugin
export default {
    name: 'redis',
    version: '1.0.0',
    register: async (server) => {
        const config = server.app.config.redis;
        let redisClientInstance;
        try {
            redisClientInstance = await redisClient(server, config);
            server.expose('redisClient', redisClientInstance);
        } catch (err) {
            server.log(['warn', 'redis'], `Redis connection failed: ${err.message}. Caching will be disabled, but API will still serve DB-backed responses.`);
            // Expose a no-op client with get/set methods that do nothing and return null/undefined
            const noopClient = {
                get: async () => null,
                set: async () => undefined,
                disconnect: async () => undefined
            };
            server.expose('redisClient', noopClient);
        }
    }
};
