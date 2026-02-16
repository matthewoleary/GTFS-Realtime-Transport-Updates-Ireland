import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/shapes GET route for fetching GTFS shape data.
 *
 * - If the optional `shapeId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified shape(s) only.
 * - If `shapeId` is omitted, returns an error (shapeId is required for shapes).
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getShapesRoute(server) {
    const logger = new ServerLogger({ client: 'getShapesRoute' });
    server.route({
        method: 'GET',
        path: '/api/shapes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const shapeIdParam = request.query.shapeId;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (shapeIdParam) {
                    const shapeIds = extractIdsFromParam(shapeIdParam);
                    for (const id of shapeIds) {
                        const shape = await db.queries.getShapeById(id);
                        if (shape && shape[0]) {
                            response.push(shape[0]);
                        }
                    }
                } else {
                    return handler.response({ error: 'shapeId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No shapes found for the specified shape(s)' }).code(404);
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
