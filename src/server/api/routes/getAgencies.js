import Joi from 'joi';
import { createCacheableResponse, createRevisionValidator } from './cacheableResponse.js';
import ServerLogger from '../../serverLogger.js';
import { getDatabaseClient, getCacheService } from '../index.js';

/**
 * Registers the /api/agencies and /api/agencies/{agencyId} GET routes for fetching GTFS agency data.
 *
 * - GET /api/agencies: Returns all agencies.
 * - GET /api/agencies/{agencyId}: Returns details for the specified agencyId as a path parameter.
 * - Both endpoints add a Unix timestamp to the response payload for client-side reference.
 * - Responds with 404 if no agency is found for the given agencyId.
 *
 * @param {object} server - Hapi server instance to register the routes on.
 * @returns {void}
 */
export default function getAgencies(server) {
    const logger = new ServerLogger({ client: 'getAgencies' });
    const cacheKeyBase = 'agencies';

    // Helper: get all agencies
    async function getAllAgencies(db, cacheService) {
        const cacheKey = `${cacheKeyBase}:all`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllAgencies(),
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
            logger.warn('Cache service not available, fetching all agencies directly from database');
            return await db.queries.getAllAgencies();
        }
    }

    // Helper: get agency by ID
    async function getAgencyById(agencyId, db, cacheService) {
        const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => {
                    const result = await db.queries.getAgencyById(agencyId);
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
            logger.warn('Cache service not available, fetching agency directly from database for agencyId: ' + agencyId);
            const result = await db.queries.getAgencyById(agencyId);
            return result && result[0] ? result[0] : null;
        }
    }

    server.route({
        method: 'GET',
        path: '/api/agencies',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const validator = createRevisionValidator(`${cacheKeyBase}:all`, dbLastUpdated);
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
                const response = await getAllAgencies(db, cacheService);
                if (!response || response.length === 0) {
                    return handler.response({ error: 'No agencies found' }).code(404);
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

    server.route({
        method: 'GET',
        path: '/api/agencies/{agencyId}',
        options: {
            validate: {
                params: Joi.object({
                    agencyId: Joi.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
                        .required()
                        .messages({
                            'string.base': 'agencyId must be a string',
                            'string.empty': 'agencyId cannot be empty',
                            'string.pattern.base': 'agencyId contains invalid characters',
                            'any.required': 'agencyId is required'
                        })
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const { agencyId } = request.params;
                const validator = createRevisionValidator(`${cacheKeyBase}:agency:${agencyId}`, dbLastUpdated);
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
                const agency = await getAgencyById(agencyId, db, cacheService);
                if (!agency) {
                    return handler.response({ error: 'Agency not found' }).code(404);
                }
                const payload = {
                    db_last_updated: dbLastUpdated,
                    response: agency
                };
                return createCacheableResponse(handler, payload, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
