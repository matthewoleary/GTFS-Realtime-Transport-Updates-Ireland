
import Joi from 'joi';
import { createCacheableResponse, createRevisionValidator } from './cacheableResponse.js';
import ServerLogger from '../../serverLogger.js';
import { getDatabaseClient, getCacheService } from '../index.js';

/**
 * Registers the /api/shapes/{shapeId} GET route for fetching GTFS shape data by shape ID.
 *
 * - Returns details for the specified shapeId as a path parameter.
 * - Responds with 404 if no shapes are found for the given shapeId.
 * - Adds a Unix timestamp to the response payload for client-side reference.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getShapes(server) {
    const logger = new ServerLogger({ client: 'getShapes' });

    async function getShapesById(shapeId, db, cacheService) {
        const cacheKey = `shapes:shape:${shapeId}`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => {
                    const result = await db.queries.getShapeById(shapeId);
                    return result && result.length > 0 ? result : [];
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
            logger.warn('Cache service not available, fetching shape directly from database for shapeId: ' + shapeId);
            const result = await db.queries.getShapeById(shapeId);
            return result && result.length > 0 ? result : [];
        }
    }

    server.route({
        method: 'GET',
        path: '/api/shapes/{shapeId}',
        options: {
            validate: {
                params: Joi.object({
                    shapeId: Joi.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_.-]+$/)
                        .required()
                        .messages({
                            'string.base': 'shapeId must be a string',
                            'string.empty': 'shapeId cannot be empty',
                            'string.pattern.base': 'shapeId contains invalid characters',
                            'any.required': 'shapeId is required'
                        })
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const { shapeId } = request.params;
                const validator = createRevisionValidator(`shapes:shape:${shapeId}`, dbLastUpdated);
                const notModified = validator && handler.entity(validator);
                if (notModified) {
                    return notModified;
                }
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn(`Cache service not available, proceeding without cache. Error: ${error.message}`);
                    cacheService = null;
                }
                const shapes = await getShapesById(shapeId, db, cacheService);
                if (!shapes || shapes.length === 0) {
                    return handler.response({ error: 'No shapes found for the specified shapeId' }).code(404);
                }
                const payload = {
                    db_last_updated: dbLastUpdated,
                    response: shapes
                };
                return createCacheableResponse(handler, payload, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
