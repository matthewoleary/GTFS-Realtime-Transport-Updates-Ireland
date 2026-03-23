
import redisClient from '../database/redisClient.js';

// When hapi registers plugins it passes the server instance to every plugin
export default {
    name: 'redis',
    version: '1.0.0',
    register: async (server) => { 
        const config = server.app.config.redis;
        const redisClientInstance = await redisClient(server, config);
        server.expose('redisClient', redisClientInstance);
    }
};
