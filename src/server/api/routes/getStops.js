import Joi from 'joi';
import { createCacheableResponse, createRevisionValidator } from './cacheableResponse.js';
import ServerLogger from '../../serverLogger.js';
import { getDatabaseClient, getCacheService } from '../index.js';

/**
 * Registers the following GTFS stop endpoints:
 *
 * - GET /api/stops: List all stops
 * - GET /api/stops?agencyId={agencyId}: List all stops for a specific agency
 * - GET /api/stops/{stopId}: Get details for a specific stop by ID
 *
 * All endpoints add `query_timestamp` to the response payload for client-side reference.
 * Uses Redis for caching at the stop, agency, and all-stops levels. Handles corrupted cache entries gracefully.
 *
 * @param {object} server - Hapi server instance to register the routes on.
 * @returns {void}
 */
export default function getStops(server) {
    const logger = new ServerLogger({ client: 'getStops' });
    const cacheKeyBase = 'stops';

    /**
     * Retrieves a stop by ID, using Redis cache if available.
     * Falls back to the database and updates the cache on miss or corruption.
     *
     * @param {string} stopId - Stop ID to fetch.
     * @param {object} db - Database client with queries.
     * @param {object|null} cacheService - Cache service instance or null.
     * @param {string} cacheKeyBase - Base string for cache key construction.
     * @returns {Promise<object|null>} Stop object or null if not found.
     */
    async function getStopById(stopId, db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:stop:${stopId}`;
        let stop;
        if (cacheService) {
            stop = await cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => {
                    const result = await db.queries.getStopById(stopId);
                    return result && result[0] ? result[0] : null;
                },
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            logger.warn('Cache service not available, fetching stop directly from database for stopId: ' + stopId);
            const result = await db.queries.getStopById(stopId);
            stop = result && result[0] ? result[0] : null;
        }
        return stop;
    }

    /**
     * Retrieves all stops for a given agency, using Redis cache if available.
     * Falls back to the database and updates the cache on miss or corruption.
     *
     * @param {string} agencyId - Agency ID to fetch stops for.
     * @param {object} db - Database client with queries.
     * @param {object|null} cacheService - Cache service instance or null.
     * @param {string} cacheKeyBase - Base string for cache key construction.
     * @returns {Promise<object[]>} Array of stop objects for the agency.
     */
    async function getStopsByAgencyId(agencyId, db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
        if (cacheService) {
            return await cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllStopsByAgencyId(agencyId),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            logger.warn('Cache service not available, fetching stops directly from database for agencyId: ' + agencyId);
            return await db.queries.getAllStopsByAgencyId(agencyId);
        }
    }

    /**
     * Retrieves all stops, using Redis cache if available.
     * Falls back to the database and updates the cache on miss or corruption.
     *
     * @param {object} db - Database client with queries.
     * @param {object|null} cacheService - Cache service instance or null.
     * @param {string} cacheKeyBase - Base string for cache key construction.
     * @returns {Promise<object[]>} Array of all stop objects.
     */
    async function getAllStops(db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:all`;
        if (cacheService) {
            return await cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllStops(),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            logger.warn('Cache service not available, fetching all stops directly from database');
            return await db.queries.getAllStops();
        }
    }

    // GET /api/stops - List all stops or filter by agencyId
    server.route({
        method: 'GET',
        path: '/api/stops',
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
                let response;
                if (agencyId) {
                    response = await getStopsByAgencyId(agencyId, db, cacheService, cacheKeyBase);
                } else {
                    response = await getAllStops(db, cacheService, cacheKeyBase);
                }
                if (!response || response.length === 0) {
                    return handler.response({ error: 'No stops found' }).code(404);
                }
                const payload = {
                    db_last_updated: dbLastUpdated,
                    response: response
                };
                return createCacheableResponse(handler, payload, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });

    // GET /api/stops/{stopId} - Get stop by ID
    server.route({
        method: 'GET',
        path: '/api/stops/{stopId}',
        options: {
            validate: {
                params: Joi.object({
                    stopId: Joi.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
                        .required()
                        .messages({
                            'string.base': 'stopId must be a string',
                            'string.empty': 'stopId cannot be empty',
                            'string.pattern.base': 'stopId contains invalid characters',
                            'any.required': 'stopId is required'
                        })
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const stopId = request.params.stopId;
                const validator = createRevisionValidator(`${cacheKeyBase}:stop:${stopId}`, dbLastUpdated);
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
                const stop = await getStopById(stopId, db, cacheService, cacheKeyBase);
                if (!stop) {
                    return handler.response({ error: `Stop with ID ${stopId} not found` }).code(404);
                }
                const payload = {
                    db_last_updated: dbLastUpdated,
                    response: stop
                };
                return createCacheableResponse(handler, payload, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
