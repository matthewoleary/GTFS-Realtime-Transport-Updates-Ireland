import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/stops GET route for fetching GTFS stop data.
 *
 * - If the optional `stopId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified stop(s) only.
 * - If `stopId` is omitted, returns all stops, optionally filtered by agency if the `agency` query parameter is provided.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getStops(server) {
    const logger = new ServerLogger({ client: 'getStops' });
    server.route({
        method: 'GET',
        path: '/api/stops',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const agencyId = request.query.agency?.toLowerCase();
                const stopIdParam = request.query.stopId;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (stopIdParam) {
                    const stopIds = extractIdsFromParam(stopIdParam);
                    response = [];
                    for (const id of stopIds) {
                        const stop = await db.queries.getStopById(id);
                        if (stop && stop[0]) {
                            response.push(stop[0]);
                        }
                    }
                } else {
                    response = await db.queries.getAllStops(agencyId);
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
