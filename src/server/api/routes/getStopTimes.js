import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRedisClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/stopTimes GET route for fetching GTFS stop times data for trips.
 *
 * - If the optional `tripId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns stop times for the specified trip(s) only.
 * - If `tripId` is omitted, returns an error (tripId is required for stop times).
 * - Adds Unix timestamp to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getStopTimes(server) {
    const logger = new ServerLogger({ client: 'getStopTimes' });
    const cacheKeyBase = 'stopTimes';
    /**
     * Pushes stopTimes to response and attempts to cache it in Redis.
     * @param {string} tripId - Trip ID
     * @param {Array} stopTimes - Stop times array
     * @param {Array} response - Response array to push to
     * @param {object|null} redisClient - Redis client instance
     * @param {string} cacheKey - Redis key
     */
    async function pushStopTimesAndCache(tripId, stopTimes, response, redisClient, cacheKey) {
        response.push({ tripId, stopTimes });
        if (redisClient) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(stopTimes));
            } catch (err) {
                logger.warn(`Redis error on set for stopTimes cacheKey ${cacheKey}: ${err.message}`);
            }
        }
    }

    server.route({
        method: 'GET',
        path: '/api/stopTimes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const redisClient = getRedisClient(request);
                if (!redisClient) {
                    logger.warn('Redis client not available, proceeding without cache.');
                }
                const tripIdParam = request.query.tripId;
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (tripIdParam) {
                    const tripIds = extractIdsFromParam(tripIdParam);
                    for (const id of tripIds) {
                        const cacheKey = `${cacheKeyBase}:trip:${id}`;
                        let cachedData;
                        if (redisClient) {
                            try {
                                cachedData = await redisClient.get(cacheKey);
                            } catch (error) {
                                logger.warn(`Redis error on get for stopTimes trip ${id}: ${error.message}`);
                                cachedData = null;
                            }
                        }
                        if (cachedData) {
                            try {
                                logger.info(`Cache hit for stopTimes trip ${id}`);
                                await pushStopTimesAndCache(id, JSON.parse(cachedData), response, null, cacheKey); // don't re-cache
                            } catch (err) {
                                logger.warn(`Corrupted cache for stopTimes trip ${id}, treating as cache miss. Error: ${err.message}`);
                                if (redisClient) {
                                    try {
                                        await redisClient.del(cacheKey);
                                    } catch (delErr) {
                                        logger.warn(`Redis error on del for stopTimes trip ${id}: ${delErr.message}`);
                                    }
                                }
                                logger.info(`Cache miss for stopTimes trip ${id}, querying database`);
                                const stopTimes = await db.queries.getStopTimesByTripId(id);
                                if (stopTimes && stopTimes.length > 0) {
                                    await pushStopTimesAndCache(id, stopTimes, response, redisClient, cacheKey);
                                }
                            }
                        } else {
                            logger.info(`Cache miss for stopTimes trip ${id}, querying database`);
                            const stopTimes = await db.queries.getStopTimesByTripId(id);
                            if (stopTimes && stopTimes.length > 0) {
                                await pushStopTimesAndCache(id, stopTimes, response, redisClient, cacheKey);
                            }
                        }
                    }
                } else {
                    return handler.response({ error: 'tripId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No stop times found for the specified trip(s)' }).code(404);
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
