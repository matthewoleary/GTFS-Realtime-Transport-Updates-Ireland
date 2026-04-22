
import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getCacheService } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';
import { CacheService } from '../../../services/cache/cacheService.js';

/**
 * Registers the /api/shapes GET route for fetching GTFS shape data.
 *
 * - If the `shapeId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified shape(s) only.
 * - If `shapeId` is omitted, returns an error (shapeId is required for shapes).
 * - Adds a Unix timestamp to the response payload for client-side reference.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getShapes(server) {
    const logger = new ServerLogger({ client: 'getShapes' });
    server.route({
        method: 'GET',
        path: '/api/shapes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn(`Cache service not available, proceeding without cache. Error: ${error.message}`);
                }
                const shapeIdParam = request.query.shapeId;
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (shapeIdParam) {
                    const shapeIds = extractIdsFromParam(shapeIdParam);
                    for (const id of shapeIds) {
                        const cacheKey = `shapes:shape:${id}`;
                        let shape;
                        if (cacheService) {
                            shape = await cacheService.getOrSetCache({
                                cacheKey,
                                dbFetchFn: async () => {
                                    const result = await db.queries.getShapeById(id);
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
                            logger.warn('Cache service not available, fetching shape directly from database for shapeId: ' + id);
                            const result = await db.queries.getShapeById(id);
                            shape = result && result[0] ? result[0] : null;
                        }
                        if (shape) {
                            response.push(shape);
                        }
                    }
                } else {
                    return handler.response({ error: 'shapeId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No shapes found for the specified shape(s)' }).code(404);
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
