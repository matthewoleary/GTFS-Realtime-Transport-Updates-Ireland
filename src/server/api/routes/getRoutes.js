import Joi from 'joi';
import { routeIdSchema } from './routeIdSchema.js';
import { createCacheableResponse, createRevisionValidator } from './cacheableResponse.js';
import ServerLogger from '../../serverLogger.js';
import { sortByRouteShortNameAsInt } from './utils.js';
import { getDatabaseClient, getCacheService } from '../index.js';

/**
 * Registers the /api/routes and /api/routes/{routeId} GET routes for fetching GTFS route data.
 *
 * - GET /api/routes: Returns all routes, optionally filtered by agencyId query parameter.
 * - GET /api/routes/{routeId}: Returns details for the specified routeId as a path parameter.
 * - Both endpoints add a Unix timestamp to the response payload for client-side reference.
 * - Responds with 404 if no route is found for the given routeId.
 *
 * @param {object} server - Hapi server instance to register the routes on.
 * @returns {void}
 */
export default function getRoutes(server) {
    const logger = new ServerLogger({ client: 'getRoutes' });
    const cacheKeyBase = 'routes';

    async function getAllRoutes(db, cacheService, agencyId) {
        if (agencyId) {
            const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
            if (cacheService) {
                return cacheService.getOrSetCache({
                    cacheKey,
                    dbFetchFn: async () => await db.queries.getAllRoutesByAgencyId(agencyId),
                    serialize: JSON.stringify,
                    deserialize: JSON.parse
                });
            } else {
                logger.warn('Cache service not available, fetching routes directly from database for agencyId: ' + agencyId);
                return await db.queries.getAllRoutesByAgencyId(agencyId);
            }
        } else {
            const cacheKey = `${cacheKeyBase}:all`;
            if (cacheService) {
                return cacheService.getOrSetCache({
                    cacheKey,
                    dbFetchFn: async () => await db.queries.getAllRoutes(),
                    serialize: JSON.stringify,
                    deserialize: JSON.parse
                });
            } else {
                logger.warn('Cache service not available, fetching all routes directly from database');
                return await db.queries.getAllRoutes();
            }
        }
    }

    async function getRouteById(routeId, db, cacheService) {
        const cacheKey = `${cacheKeyBase}:route:${routeId}`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => {
                    const result = await db.queries.getRouteById(routeId);
                    return result && result[0] ? result[0] : null;
                },
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            logger.warn('Cache service not available, fetching route directly from database for routeId: ' + routeId);
            const result = await db.queries.getRouteById(routeId);
            return result && result[0] ? result[0] : null;
        }
    }

    server.route({
        method: 'GET',
        path: '/api/routes',
        options: {
            validate: {
                query: Joi.object({
                    agencyId: Joi.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
                        .optional()
                        .messages({
                            'string.base': 'agencyId must be a string',
                            'string.empty': 'agencyId cannot be empty',
                            'string.pattern.base': 'agencyId contains invalid characters'
                        })
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const agencyId = request.query.agencyId;
                const resourceKey = agencyId
                    ? `${cacheKeyBase}:agency:${agencyId}`
                    : `${cacheKeyBase}:all`;
                const validator = createRevisionValidator(resourceKey, dbLastUpdated);
                const notModified = validator && handler.entity(validator);
                if (notModified) {
                    return notModified;
                }
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    cacheService = null;
                }
                const response = await getAllRoutes(db, cacheService, agencyId);
                const sortedRecords = await sortByRouteShortNameAsInt(response || []);
                if (!sortedRecords || sortedRecords.length === 0) {
                    return handler.response({ error: 'No routes found' }).code(404);
                }
                const payload = {
                    db_last_updated: dbLastUpdated,
                    response: sortedRecords
                };
                return createCacheableResponse(handler, payload, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/api/routes/{routeId}',
        options: {
            validate: {
                params: Joi.object({
                    routeId: routeIdSchema
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const { routeId } = request.params;
                const validator = createRevisionValidator(`${cacheKeyBase}:route:${routeId}`, dbLastUpdated);
                const notModified = validator && handler.entity(validator);
                if (notModified) {
                    return notModified;
                }
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    cacheService = null;
                }
                const route = await getRouteById(routeId, db, cacheService);
                if (!route) {
                    return handler.response({ error: 'Route not found' }).code(404);
                }
                const payload = {
                    db_last_updated: dbLastUpdated,
                    response: route
                };
                return createCacheableResponse(handler, payload, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
