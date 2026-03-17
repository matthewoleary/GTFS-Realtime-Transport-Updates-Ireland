import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRealtimeVehiclePositionsClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/trips GET route for fetching GTFS trip data.
 *
 * - If the optional `tripId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified trip(s) only.
 * - If `tripId` is omitted, returns an error (tripId is required for trips).
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getTrips(server) {
    const logger = new ServerLogger({ client: 'getTrips' });
    server.route({
        method: 'GET',
        path: '/api/trips',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const realtime = getRealtimeVehiclePositionsClient(request);
                const tripIdParam = request.query.tripId;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (tripIdParam) {
                    const tripIds = extractIdsFromParam(tripIdParam);
                    for (const id of tripIds) {
                        const trip = await db.queries.getTripById(id);
                        if (trip && trip[0]) {
                            response.push(trip[0]);
                        }
                    }
                } else {
                    return handler.response({ error: 'tripId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No trips found for the specified trip(s)' }).code(404);
                }
                let payload = {
                    since_midnight_timestamp: currentTimestamp,
                    query_timestamp: unixTimestamp,
                    response: response
                };
                payload = await realtime.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
                return handler.response(payload);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
