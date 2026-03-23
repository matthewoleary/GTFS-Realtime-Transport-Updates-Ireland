
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
            server.expose('redisClient', null);
        }
    }
};
