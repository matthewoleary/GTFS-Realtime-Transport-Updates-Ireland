import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/stopTimes GET route for fetching GTFS stop times data for trips.
 *
 * - If the optional `tripId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns stop times for the specified trip(s) only.
 * - If `tripId` is omitted, returns an error (tripId is required for stop times).
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getStopTimesForTrip(server) {
    const logger = new ServerLogger({ client: 'getStopTimesForTrip' });
    server.route({
        method: 'GET',
        path: '/api/stopTimes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const tripIdParam = request.query.tripId;
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (tripIdParam) {
                    const tripIds = extractIdsFromParam(tripIdParam);
                    for (const id of tripIds) {
                        const stopTimes = await db.queries.getStopTimesByTripId(id);
                        if (stopTimes && stopTimes.length > 0) {
                            response.push({ tripId: id, stopTimes });
                        }
                    }
                } else {
                    return handler.response({ error: 'tripId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No stop times found for the specified trip(s)' }).code(404);
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
