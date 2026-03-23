import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient } from '../index.js';
import { getRedisClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/stops GET route for fetching GTFS stop data.
 *
 * - If the optional `stopId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified stop(s) only.
 * - If `stopId` is omitted, returns all stops, optionally filtered by agency if the `agency` query parameter is provided.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
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
                const agencyId = request.query.agencyId;
                const stopIdParam = request.query.stopId;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (stopIdParam) {
                    const stopIds = extractIdsFromParam(stopIdParam);
                    response = [];
                    for (const id of stopIds) {
                        const cacheKey = `${cacheKeyBase}:stop:${id}`;
                        const cachedData = await redisClient.get(cacheKey);
                        if (cachedData) {
                            logger.info(`Cache hit for stop ${id}`);
                            response.push(JSON.parse(cachedData));
                        } else {
                            logger.info(`Cache miss for stop ${id}, querying database`);
                            const stop = await db.queries.getStopById(id);
                            if (stop && stop[0]) {
                                response.push(stop[0]);
                                await redisClient.set(cacheKey, JSON.stringify(stop[0]));
                            }
                        }
                    }
                } else if (agencyId) {
                    const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
                    const cachedData = await redisClient.get(cacheKey);
                    if (cachedData) {
                        logger.info(`Cache hit for stops of agency ${agencyId}`);
                        response = JSON.parse(cachedData);
                    } else {
                        logger.info(`Cache miss for stops of agency ${agencyId}, querying database`);
                        response = await db.queries.getAllStopsByAgencyId(agencyId);
                        await redisClient.set(cacheKey, JSON.stringify(response));
                    }
                } else {
                    const cacheKey = `${cacheKeyBase}:all`;
                    const cachedData = await redisClient.get(cacheKey);
                    if (cachedData) {
                        logger.info('Cache hit for all stops');
                        response = JSON.parse(cachedData);
                    } else {
                        logger.info('Cache miss for all stops, querying database');
                        response = await db.queries.getAllStops();
                        await redisClient.set(cacheKey, JSON.stringify(response));
                    }
                }
                const payload = {
                    since_midnight_timestamp: currentTimestamp,
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
