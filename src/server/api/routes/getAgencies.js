import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRedisClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/agencies GET route for fetching GTFS agency data.
 *
 * - If the optional `agencyId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified agency/agencies only.
 * - If `agencyId` is omitted, returns all agencies.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getAgencies(server) {
    const logger = new ServerLogger({ client: 'getAgencies' });
    const cacheKeyBase = 'agencies';

    // Helper: Pushes agency to response and attempts to cache it in Redis.
    async function pushAgencyAndCache(agency, response, redisClient, cacheKey) {
        response.push(agency);
        if (redisClient) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(agency));
            } catch (err) {
                logger.warn(`Redis error on set for agency cacheKey ${cacheKey}: ${err.message}`);
            }
        }
    }

    // Retrieves agency details for a list of agency IDs, using Redis cache if available.
    async function getAgenciesByIds(agencyIds, db, redisClient, logger, cacheKeyBase) {
        const response = [];
        for (const id of agencyIds) {
            const cacheKey = `${cacheKeyBase}:agency:${id}`;
            let cachedData;
            if (redisClient) {
                try {
                    cachedData = await redisClient.get(cacheKey);
                } catch (e) {
                    logger.warn(`Redis error on get for agency ${id}: ${e.message}`);
                    cachedData = null;
                }
            }
            if (cachedData) {
                try {
                    logger.info(`Cache hit for agency ${id}`);
                    response.push(JSON.parse(cachedData));
                } catch (err) {
                    logger.warn(`Corrupted cache for agency ${id}, treating as cache miss. Error: ${err.message}`);
                    if (redisClient) {
                        try {
                            await redisClient.del(cacheKey);
                        } catch (delErr) {
                            logger.warn(`Redis error on del for agency ${id}: ${delErr.message}`);
                        }
                    }
                    logger.info(`Cache miss for agency ${id}, querying database`);
                    const agency = await db.queries.getAgencyById(id);
                    if (agency && agency[0]) {
                        await pushAgencyAndCache(agency[0], response, redisClient, cacheKey);
                    }
                }
            } else {
                logger.info(`Cache miss for agency ${id}, querying database`);
                const agency = await db.queries.getAgencyById(id);
                if (agency && agency[0]) {
                    await pushAgencyAndCache(agency[0], response, redisClient, cacheKey);
                }
            }
        }
        return response;
    }

    // Retrieves all agencies, using Redis cache if available.
    async function getAllAgenciesWithCache(db, redisClient, logger, cacheKeyBase) {
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
            } catch (error) {
                logger.warn(`Corrupted cache for ${cacheKey}, treating as cache miss. Error: ${error.message}`);
                if (redisClient) {
                    try {
                        await redisClient.del(cacheKey);
                    } catch (delErr) {
                        logger.warn(`Redis error on del for ${cacheKey}: ${delErr.message}`);
                    }
                }
                logger.info(`Cache miss for ${cacheKey}, querying database`);
                const response = await db.queries.getAllAgencies();
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
            const response = await db.queries.getAllAgencies();
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
        path: '/api/agencies',
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
                const agencyIdParam = request.query.agencyId;
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (agencyIdParam) {
                    const agencyIds = extractIdsFromParam(agencyIdParam);
                    response = await getAgenciesByIds(agencyIds, db, redisClient, logger, cacheKeyBase);
                } else {
                    response = await getAllAgenciesWithCache(db, redisClient, logger, cacheKeyBase);
                }
                if (!response || response.length === 0) {
                    return handler.response({ error: 'No agencies found' }).code(404);
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
