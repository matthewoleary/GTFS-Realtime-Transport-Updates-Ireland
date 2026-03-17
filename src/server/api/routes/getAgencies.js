import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp } from '../../../utils/timestampUtils.js';

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
    server.route({
        method: 'GET',
        path: '/api/agencies',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const agencyIdParam = request.query.agencyId;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (agencyIdParam) {
                    const agencyIds = extractIdsFromParam(agencyIdParam);
                    response = [];
                    for (const id of agencyIds) {
                        const agency = await db.queries.getAgencyById(id);
                        if (agency && agency[0]) {
                            response.push(agency[0]);
                        }
                    }
                } else {
                    response = await db.queries.getAllAgencies();
                }
                if (!response || response.length === 0) {
                    return handler.response({ error: 'No agencies found' }).code(404);
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
