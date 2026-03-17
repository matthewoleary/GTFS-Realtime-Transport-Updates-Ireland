import ServerLogger from '../../serverLogger.js';
import { sortByRouteShortNameAsInt, extractIdsFromParam } from './utils.js';
import { getDatabaseClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp } from '../../../utils/timestampUtils.js';

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
    server.route({
        method: 'GET',
        path: '/api/routes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const agencyId = request.query.agencyId; // Optional agencyId for filtering routes by agency
                const routeIdParam = request.query.routeId;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (routeIdParam) {
                    const routeIds = extractIdsFromParam(routeIdParam);
                    response = [];
                    for (const id of routeIds) {
                        const route = await db.queries.getRouteById(id);
                        if (route && route[0]) {
                            response.push(route[0]);
                        }
                    }
                } else {
                    response = await db.queries.getAllRoutes(agencyId); // Pass agencyId to filter routes by agency if provided.
                }
                const sortedRecords = await sortByRouteShortNameAsInt(response || []);
                const payload = {
                    since_midnight_timestamp: currentTimestamp,
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
