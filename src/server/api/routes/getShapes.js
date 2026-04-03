import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRedisClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/shapes GET route for fetching GTFS shape data.
 *
 * - If the optional `shapeId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified shape(s) only.
 * - If `shapeId` is omitted, returns an error (shapeId is required for shapes).
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getShapes(server) {
    const logger = new ServerLogger({ client: 'getShapes' });
    server.route({
        method: 'GET',
        path: '/api/shapes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                let redisClient = null;
                try {
                    redisClient = getRedisClient(request);
                } catch (error) {
                    logger.warn(`Redis client not available, proceeding without cache. Error: ${error.message}`);
                }
                const shapeIdParam = request.query.shapeId;
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (shapeIdParam) {
                    const shapeIds = extractIdsFromParam(shapeIdParam);
                    for (const id of shapeIds) {
                        const cacheKey = `shapes:shape:${id}`;
                        let cachedData;
                        if (redisClient) {
                            try {
                                cachedData = await redisClient.get(cacheKey);
                            } catch (e) {
                                logger.warn(`Redis error on get for shape ${id}: ${e.message}`);
                                cachedData = null;
                            }
                        }
                        if (cachedData) {
                            try {
                                logger.info(`Cache hit for shape ${id}`);
                                response.push(JSON.parse(cachedData));
                            } catch (err) {
                                logger.warn(`Corrupted cache for shape ${id}, treating as cache miss. Error: ${err.message}`);
                                if (redisClient) {
                                    try {
                                        await redisClient.del(cacheKey);
                                    } catch (delErr) {
                                        logger.warn(`Failed to delete corrupted cache for shape ${id}: ${delErr.message}`);
                                    }
                                }
                                logger.info(`Cache miss for shape ${id}, querying database`);
                                const shape = await db.queries.getShapeById(id);
                                if (shape && shape[0]) {
                                    response.push(shape[0]);
                                    if (redisClient) {
                                        try {
                                            await redisClient.set(cacheKey, JSON.stringify(shape[0]));
                                        } catch (setErr) {
                                            logger.warn(`Failed to set cache for shape ${id}: ${setErr.message}`);
                                        }
                                    }
                                }
                            }
                        } else {
                            logger.info(`Cache miss for shape ${id}, querying database`);
                            const shape = await db.queries.getShapeById(id);
                            if (shape && shape[0]) {
                                response.push(shape[0]);
                                if (redisClient) {
                                    try {
                                        await redisClient.set(cacheKey, JSON.stringify(shape[0]));
                                    } catch (setErr) {
                                        logger.warn(`Failed to set cache for shape ${id}: ${setErr.message}`);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    return handler.response({ error: 'shapeId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No shapes found for the specified shape(s)' }).code(404);
                }
                const payload = {
                    query_timestamp: unixTimestamp,
                    response: response
                };
                return handler.response(payload);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
