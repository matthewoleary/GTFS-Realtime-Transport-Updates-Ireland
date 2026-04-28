import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getCacheService } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/trips/{tripId}/stopTimes GET route for fetching GTFS stop times for a specific trip.
 *
 * - Returns stop times for the specified tripId (path parameter).
 * - Adds Unix timestamp to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getStopTimes(server) {
    const logger = new ServerLogger({ client: 'getStopTimes' });
    const cacheKeyBase = 'stopTimes';

    // GET /api/trips/{tripId}/stopTimes - List stop times for a trip
    server.route({
        method: 'GET',
        path: '/api/trips/{tripId}/stopTimes',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    cacheService = null;
                }
                const tripId = request.params.tripId;
                const unixTimestamp = getUnixTimestamp();
                const cacheKey = `${cacheKeyBase}:trip:${tripId}`;
                let stopTimes;
                if (cacheService) {
                    stopTimes = await cacheService.getOrSetCache({
                        cacheKey,
                        dbFetchFn: async () => await db.queries.getStopTimesByTripId(tripId),
                        serialize: JSON.stringify,
                        deserialize: JSON.parse
                    });
                } else {
                    logger.warn('Cache service not available, fetching stop times directly from database for tripId: ' + tripId);
                    stopTimes = await db.queries.getStopTimesByTripId(tripId);
                }
                if (!stopTimes || stopTimes.length === 0) {
                    return handler.response({ error: `No stop times found for tripId ${tripId}` }).code(404);
                }
                const payload = {
                    query_timestamp: unixTimestamp,
                    response: stopTimes
                };
                return handler.response(payload);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
