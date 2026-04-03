import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRedisClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/stops GET route for fetching GTFS stop data.
 *
 * Query Parameters:
 * - `stopId` (string | array, optional):
 *     - If provided, returns details for the specified stop(s) only.
 *     - Accepts a single stop ID, a comma-separated list, or multiple stopId parameters.
 * - `agencyId` (string, optional):
 *     - If provided (and stopId is not), returns all stops for the specified agency.
 *     - If both stopId and agencyId are provided, only stopId is used.
 *
 * Behavior:
 * - If neither parameter is provided, returns all stops.
 * - Adds `query_timestamp` to the response payload for client-side reference.
 * - Uses Redis for caching at the stop, agency, and all-stops levels. Handles corrupted cache entries gracefully.
 *
 * Response Example:
 * {
 *   query_timestamp: <number>,
 *   response: [ { stop_id, ... }, ... ]
 * }
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getStops(server) {
    const logger = new ServerLogger({ client: 'getStops' });
    const cacheKeyBase = 'stops';
    server.route({
        method: 'GET',
        path: '/api/stops',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const redisClient = getRedisClient(request);
                if (!redisClient) {
                    logger.warn('Redis client not available, proceeding without cache.');
                }
                const agencyId = request.query.agencyId;
                const stopIdParam = request.query.stopId;
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (stopIdParam) {
                    const stopIds = extractIdsFromParam(stopIdParam);
                    response = await getStopsByIds(stopIds, db, redisClient, logger, cacheKeyBase);
                } else if (agencyId) {
                    response = await getStopsByAgencyId(agencyId, db, redisClient, logger, cacheKeyBase);
                } else {
                    response = await getAllStops(db, redisClient, logger, cacheKeyBase);
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

/**
 * Retrieves stop details for a list of stop IDs, using Redis cache if available.
 * Falls back to the database and updates the cache on miss or corruption.
 *
 * @param {string[]} stopIds - Array of stop IDs to fetch.
 * @param {object} db - Database client with queries.
 * @param {object|null} redisClient - Redis client instance or null.
 * @param {object} logger - Logger instance for logging.
 * @param {string} cacheKeyBase - Base string for cache key construction.
 * @returns {Promise<object[]>} Array of stop objects.
 */
async function getStopsByIds(stopIds, db, redisClient, logger, cacheKeyBase) {
    const response = [];
    for (const id of stopIds) {
        const cacheKey = `${cacheKeyBase}:stop:${id}`;
        let cachedData;
        if (redisClient) {
            try {
                cachedData = await redisClient.get(cacheKey);
            } catch (e) {
                logger.warn(`Redis error on get for stop ${id}: ${e.message}`);
                cachedData = null;
            }
        }
        if (cachedData) {
            try {
                logger.info(`Cache hit for stop ${id}`);
                response.push(JSON.parse(cachedData));
            } catch (err) {
                logger.warn(`Corrupted cache for stop ${id}, treating as cache miss. Error: ${err.message}`);
                if (redisClient) {
                    await redisClient.del(cacheKey);
                }
                logger.info(`Cache miss for stop ${id}, querying database`);
                const stop = await db.queries.getStopById(id);
                if (stop && stop[0]) {
                    response.push(stop[0]);
                    if (redisClient) {
                        await redisClient.set(cacheKey, JSON.stringify(stop[0]));
                    }
                }
            }
        } else {
            logger.info(`Cache miss for stop ${id}, querying database`);
            const stop = await db.queries.getStopById(id);
            if (stop && stop[0]) {
                response.push(stop[0]);
                if (redisClient) {
                    await redisClient.set(cacheKey, JSON.stringify(stop[0]));
                }
            }
        }
    }
    return response;
}

/**
 * Retrieves all stops for a given agency, using Redis cache if available.
 * Falls back to the database and updates the cache on miss or corruption.
 *
 * @param {string} agencyId - Agency ID to fetch stops for.
 * @param {object} db - Database client with queries.
 * @param {object|null} redisClient - Redis client instance or null.
 * @param {object} logger - Logger instance for logging.
 * @param {string} cacheKeyBase - Base string for cache key construction.
 * @returns {Promise<object[]>} Array of stop objects for the agency.
 */
async function getStopsByAgencyId(agencyId, db, redisClient, logger, cacheKeyBase) {
    const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
    let cachedData;
    if (redisClient) {
        try {
            cachedData = await redisClient.get(cacheKey);
        } catch (e) {
            logger.warn(`Redis error on get for agency ${agencyId}: ${e.message}`);
            cachedData = null;
        }
    }
    if (cachedData) {
        try {
            logger.info(`Cache hit for stops of agency ${agencyId}`);
            return JSON.parse(cachedData);
        } catch (err) {
            logger.warn(`Corrupted cache for agency ${agencyId}, treating as cache miss. Error: ${err.message}`);
            if (redisClient) {
                await redisClient.del(cacheKey);
            }
            logger.info(`Cache miss for stops of agency ${agencyId}, querying database`);
            const response = await db.queries.getAllStopsByAgencyId(agencyId);
            if (redisClient) {
                await redisClient.set(cacheKey, JSON.stringify(response));
            }
            return response;
        }
    } else {
        logger.info(`Cache miss for stops of agency ${agencyId}, querying database`);
        const response = await db.queries.getAllStopsByAgencyId(agencyId);
        if (redisClient) {
            await redisClient.set(cacheKey, JSON.stringify(response));
        }
        return response;
    }
}

/**
 * Retrieves all stops, using Redis cache if available.
 * Falls back to the database and updates the cache on miss or corruption.
 *
 * @param {object} db - Database client with queries.
 * @param {object|null} redisClient - Redis client instance or null.
 * @param {object} logger - Logger instance for logging.
 * @param {string} cacheKeyBase - Base string for cache key construction.
 * @returns {Promise<object[]>} Array of all stop objects.
 */
async function getAllStops(db, redisClient, logger, cacheKeyBase) {
    const cacheKey = `${cacheKeyBase}:all`;
    let cachedData;
    if (redisClient) {
        try {
            cachedData = await redisClient.get(cacheKey);
        } catch (e) {
            logger.warn(`Redis error on get for all stops: ${e.message}`);
            cachedData = null;
        }
    }
    if (cachedData) {
        try {
            logger.info('Cache hit for all stops');
            return JSON.parse(cachedData);
        } catch (err) {
            logger.warn(`Corrupted cache for all stops, treating as cache miss. Error: ${err.message}`);
            if (redisClient) {
                await redisClient.del(cacheKey);
            }
            logger.info('Cache miss for all stops, querying database');
            const response = await db.queries.getAllStops();
            if (redisClient) {
                await redisClient.set(cacheKey, JSON.stringify(response));
            }
            return response;
        }
    } else {
        logger.info('Cache miss for all stops, querying database');
        const response = await db.queries.getAllStops();
        if (redisClient) {
            await redisClient.set(cacheKey, JSON.stringify(response));
        }
        return response;
    }
}
