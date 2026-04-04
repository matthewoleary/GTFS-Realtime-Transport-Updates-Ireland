import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRealtimeVehiclePositionsClient, getRedisClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/trips GET route for fetching GTFS trip data.
 *
 * - If the optional `tripId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified trip(s) only.
 * - If `tripId` is omitted, returns an error (tripId is required for trips).
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getTrips(server) {
    const logger = new ServerLogger({ client: 'getTrips' });
    const cacheKeyBase = 'trips';

    /**
         * Pushes trip to response and attempts to cache it in Redis.
         * @param {object} trip - Trip object
         * @param {Array} response - Response array to push to
         * @param {object} redisClient - Redis client instance
         * @param {string} cacheKey - Redis key
         */
    async function pushTripAndCache(trip, response, redisClient, cacheKey) {
        response.push(trip);
        if (redisClient) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(trip));
            } catch (err) {
                logger.warn(`Redis error on set for trip cacheKey ${cacheKey}: ${err.message}`);
            }
        }
    }

    server.route({
        method: 'GET',
        path: '/api/trips',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const realtime = getRealtimeVehiclePositionsClient(request);
                const redisClient = getRedisClient(request)
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
                            } catch (e) {
                                logger.warn(`Redis error on get for trip ${id}: ${e.message}`);
                                cachedData = null;
                            }
                        }
                        if (cachedData) {
                            try {
                                logger.info(`Cache hit for trip ${id}`);
                                response.push(JSON.parse(cachedData));
                            } catch (err) {
                                logger.warn(`Corrupted cache for trip ${id}, treating as cache miss. Error: ${err.message}`);
                                if (redisClient) {
                                    try {
                                        await redisClient.del(cacheKey);
                                    } catch (delErr) {
                                        logger.warn(`Redis error on del for trip ${id}: ${delErr.message}`);
                                    }
                                }
                                logger.info(`Cache miss for trip ${id}, querying database`);
                                const trip = await db.queries.getTripById(id);
                                if (trip && trip[0]) {
                                    await pushTripAndCache(trip[0], response, redisClient, cacheKey);
                                }
                            }
                        } else {
                            logger.info(`Cache miss for trip ${id}, querying database`);
                            const trip = await db.queries.getTripById(id);
                            if (trip && trip[0]) {
                                await pushTripAndCache(trip[0], response, redisClient, cacheKey);
                            }
                        }
                    }
                } else {
                    return handler.response({ error: 'tripId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No trips found for the specified trip(s)' }).code(404);
                }
                let payload = {
                    query_timestamp: unixTimestamp,
                    response: response
                };
                payload = await realtime.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
                return handler.response(payload);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
