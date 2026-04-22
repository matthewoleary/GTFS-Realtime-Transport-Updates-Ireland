import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getRealtimeVehiclePositionsClient, getCacheService } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';
import { CacheService } from '../../../services/cache/cacheService.js';

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
    const cacheKeyBase = 'trips';
    server.route({
        method: 'GET',
        path: '/api/trips',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const realtime = getRealtimeVehiclePositionsClient(request);
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    cacheService = null;
                }
                const tripIdParam = request.query.tripId;
                const unixTimestamp = getUnixTimestamp();
                let response = [];
                if (tripIdParam) {
                    const tripIds = extractIdsFromParam(tripIdParam);
                    for (const id of tripIds) {
                        const cacheKey = `${cacheKeyBase}:trip:${id}`;
                        let trip;
                        if (cacheService) {
                            trip = await cacheService.getOrSetCache({
                                cacheKey,
                                dbFetchFn: async () => {
                                    const result = await db.queries.getTripById(id);
                                    return result && result[0] ? result[0] : null;
                                },
                                serialize: JSON.stringify,
                                deserialize: JSON.parse
                            });
                        } else {
                            logger.warn('Cache service not available, fetching trip directly from database for tripId: ' + id);
                            const result = await db.queries.getTripById(id);
                            trip = result && result[0] ? result[0] : null;
                        }
                        if (trip) {
                            response.push(trip);
                        }
                    }
                } else {
                    return handler.response({ error: 'tripId query parameter is required' }).code(400);
                }
                if (response.length === 0) {
                    return handler.response({ error: 'No trips found for the specified trip(s)' }).code(404);
                }
                let payload = {
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
