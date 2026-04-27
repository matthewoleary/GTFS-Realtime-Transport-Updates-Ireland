
import ServerLogger from '../../serverLogger.js';
import { sortByRouteShortNameAsInt, extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getCacheService } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';
import { CacheService } from '../../../services/cache/cacheService.js';

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

    // Retrieves route details for a list of route IDs, using CacheService for cache logic.
    async function getRoutesByIds(routeIds, db, cacheService, cacheKeyBase) {
        const response = [];
        for (const id of routeIds) {
            const cacheKey = `${cacheKeyBase}:route:${id}`;
            let route;
            if (cacheService) {
                route = await cacheService.getOrSetCache({
                    cacheKey,
                    dbFetchFn: async () => {
                        const result = await db.queries.getRouteById(id);
                        return result && result[0] ? result[0] : null;
                    },
                    serialize: JSON.stringify,
                    deserialize: (data) => {
                        try {
                            return JSON.parse(data);
                        } catch (err) {
                            throw err;
                        }
                    }
                });
            } else {
                logger.warn('Cache service not available, fetching route directly from database for routeId: ' + id);
                const result = await db.queries.getRouteById(id);
                route = result && result[0] ? result[0] : null;
            }
            if (route) {
                response.push(route);
            }
        }
        return response;
    }

    // Retrieves all routes for a given agency, using CacheService for cache logic.
    async function getRoutesByAgencyId(agencyId, db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllRoutesByAgencyId(agencyId),
                serialize: JSON.stringify,
                deserialize: (data) => {
                    try {
                        return JSON.parse(data);
                    } catch (err) {
                        throw err;
                    }
                }
            });
        } else {
            logger.warn('Cache service not available, fetching routes directly from database for agencyId: ' + agencyId);
            return await db.queries.getAllRoutesByAgencyId(agencyId);
        }
    }

    // Retrieves all routes, using CacheService for cache logic.
    async function getAllRoutes(db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:all`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllRoutes(),
                serialize: JSON.stringify,
                deserialize: (data) => {
                    try {
                        return JSON.parse(data);
                    } catch (err) {
                        throw err;
                    }
                }
            });
        } else {
            logger.warn('Cache service not available, fetching all routes directly from database');
            return await db.queries.getAllRoutes();
        }
    }

    server.route({
        method: 'GET',
        path: '/api/routes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    cacheService = null;
                }
                const agencyId = request.query.agencyId;
                const routeIdParam = request.query.routeId;
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (routeIdParam) {
                    const routeIds = extractIdsFromParam(routeIdParam);
                    response = await getRoutesByIds(routeIds, db, cacheService, cacheKeyBase);
                } else if (agencyId) {
                    response = await getRoutesByAgencyId(agencyId, db, cacheService, cacheKeyBase);
                } else {
                    response = await getAllRoutes(db, cacheService, cacheKeyBase);
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
