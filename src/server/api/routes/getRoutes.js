import ServerLogger from '../../serverLogger.js';
import { sortByRouteShortNameAsInt, extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRedisClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/routes GET route for fetching GTFS route data.
 *
 * - If the optional `routeId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified route(s) only.
 * - If `routeId` is omitted, returns all routes, optionally filtered by agency if the `agencyId` query parameter is provided.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getRoutes(server) {
    const logger = new ServerLogger({ client: 'getRoutes' });
    const cacheKeyBase = 'routes';

    // Helper: Pushes route to response and attempts to cache it in Redis.
    async function pushRouteAndCache(route, response, redisClient, cacheKey) {
        response.push(route);
        if (redisClient) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(route));
            } catch (err) {
                logger.warn(`Redis error on set for route cacheKey ${cacheKey}: ${err.message}`);
            }
        }
    }

    // Retrieves route details for a list of route IDs, using Redis cache if available.
    async function getRoutesByIds(routeIds, db, redisClient, logger, cacheKeyBase) {
        const response = [];
        for (const id of routeIds) {
            const cacheKey = `${cacheKeyBase}:route:${id}`;
            let cachedData;
            if (redisClient) {
                try {
                    cachedData = await redisClient.get(cacheKey);
                } catch (e) {
                    logger.warn(`Redis error on get for route ${id}: ${e.message}`);
                    cachedData = null;
                }
            }
            if (cachedData) {
                try {
                    logger.info(`Cache hit for route ${id}`);
                    response.push(JSON.parse(cachedData));
                } catch (err) {
                    logger.warn(`Corrupted cache for route ${id}, treating as cache miss. Error: ${err.message}`);
                    if (redisClient) {
                        try {
                            await redisClient.del(cacheKey);
                        } catch (delErr) {
                            logger.warn(`Redis error on del for route ${id}: ${delErr.message}`);
                        }
                    }
                    logger.info(`Cache miss for route ${id}, querying database`);
                    const route = await db.queries.getRouteById(id);
                    if (route && route[0]) {
                        await pushRouteAndCache(route[0], response, redisClient, cacheKey);
                    }
                }
            } else {
                logger.info(`Cache miss for route ${id}, querying database`);
                const route = await db.queries.getRouteById(id);
                if (route && route[0]) {
                    await pushRouteAndCache(route[0], response, redisClient, cacheKey);
                }
            }
        }
        return response;
    }

    // Retrieves all routes for a given agency, using Redis cache if available.
    async function getRoutesByAgencyId(agencyId, db, redisClient, logger, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
        let cachedData;
        if (redisClient) {
            try {
                cachedData = await redisClient.get(cacheKey);
            } catch (e) {
                logger.warn(`Redis error on get for ${cacheKey}: ${e.message}`);
                cachedData = null;
            }
        }
        if (cachedData) {
            try {
                logger.info(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedData);
            } catch (err) {
                logger.warn(`Corrupted cache for ${cacheKey}, treating as cache miss. Error: ${err.message}`);
                if (redisClient) {
                    try {
                        await redisClient.del(cacheKey);
                    } catch (delErr) {
                        logger.warn(`Redis error on del for ${cacheKey}: ${delErr.message}`);
                    }
                }
                logger.info(`Cache miss for ${cacheKey}, querying database`);
                const response = await db.queries.getAllRoutesByAgencyId(agencyId);
                if (redisClient) {
                    try {
                        await redisClient.set(cacheKey, JSON.stringify(response));
                    } catch (setErr) {
                        logger.warn(`Redis error on set for ${cacheKey}: ${setErr.message}`);
                    }
                }
                return response;
            }
        } else {
            logger.info(`Cache miss for ${cacheKey}, querying database`);
            const response = await db.queries.getAllRoutesByAgencyId(agencyId);
            if (redisClient) {
                try {
                    await redisClient.set(cacheKey, JSON.stringify(response));
                } catch (setErr) {
                    logger.warn(`Redis error on set for ${cacheKey}: ${setErr.message}`);
                }
            }
            return response;
        }
    }

    // Retrieves all routes, using Redis cache if available.
    async function getAllRoutes(db, redisClient, logger, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:all`;
        let cachedData;
        if (redisClient) {
            try {
                cachedData = await redisClient.get(cacheKey);
            } catch (e) {
                logger.warn(`Redis error on get for ${cacheKey}: ${e.message}`);
                cachedData = null;
            }
        }
        if (cachedData) {
            try {
                logger.info(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedData);
            } catch (err) {
                logger.warn(`Corrupted cache for ${cacheKey}, treating as cache miss. Error: ${err.message}`);
                if (redisClient) {
                    try {
                        await redisClient.del(cacheKey);
                    } catch (delErr) {
                        logger.warn(`Redis error on del for ${cacheKey}: ${delErr.message}`);
                    }
                }
                logger.info(`Cache miss for ${cacheKey}, querying database`);
                const response = await db.queries.getAllRoutes();
                if (redisClient) {
                    try {
                        await redisClient.set(cacheKey, JSON.stringify(response));
                    } catch (setErr) {
                        logger.warn(`Redis error on set for ${cacheKey}: ${setErr.message}`);
                    }
                }
                return response;
            }
        } else {
            logger.info(`Cache miss for ${cacheKey}, querying database`);
            const response = await db.queries.getAllRoutes();
            if (redisClient) {
                try {
                    await redisClient.set(cacheKey, JSON.stringify(response));
                } catch (setErr) {
                    logger.warn(`Redis error on set for ${cacheKey}: ${setErr.message}`);
                }
            }
            return response;
        }
    }

    server.route({
        method: 'GET',
        path: '/api/routes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                let redisClient = null;
                try {
                    redisClient = getRedisClient(request);
                } catch (error) {
                    logger.warn('Redis client not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    redisClient = null;
                }
                const agencyId = request.query.agencyId;
                const routeIdParam = request.query.routeId;
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (routeIdParam) {
                    const routeIds = extractIdsFromParam(routeIdParam);
                    response = await getRoutesByIds(routeIds, db, redisClient, logger, cacheKeyBase);
                } else if (agencyId) {
                    response = await getRoutesByAgencyId(agencyId, db, redisClient, logger, cacheKeyBase);
                } else {
                    response = await getAllRoutes(db, redisClient, logger, cacheKeyBase);
                }
                const sortedRecords = await sortByRouteShortNameAsInt(response || []);
                const payload = {
                    query_timestamp: unixTimestamp,
                    response: sortedRecords
                };
                return handler.response(payload);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
