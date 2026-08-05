import Joi from 'joi';
import ServerLogger from '../../serverLogger.js';
import { getDatabaseClient, getRealtimeVehiclePositionsClient, getRealtimeTripUpdatesClient, getCacheService } from '../index.js';

/**
 * Registers the /api/trips/{tripId} GET route for fetching a GTFS trip by ID.
 *
 * - Returns details for the specified trip.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getTrips(server) {
    const logger = new ServerLogger({ client: 'getTrips' });
    const cacheKeyBase = 'trips';

    // GET /api/trips/{tripId} - Get trip by ID
    server.route({
        method: 'GET',
        path: '/api/trips/{tripId}',
        options: {
            validate: {
                params: Joi.object({
                    tripId: Joi.string().min(1).max(32).pattern(/^[\p{L}\p{N} ._:+/%-]+$/u)
                        .custom((value, helpers) => value === value.trim() ? value : helpers.error('string.surroundingWhitespace'))
                        .required()
                        .messages({
                            'string.base': 'tripId must be a string',
                            'string.empty': 'tripId cannot be empty',
                            'string.pattern.base': 'tripId contains invalid characters',
                            'string.surroundingWhitespace': 'tripId cannot start or end with whitespace',
                            'any.required': 'tripId is required'
                        })
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const realtimeVehiclePositions = getRealtimeVehiclePositionsClient(request);
                const realtimeTripUpdates = getRealtimeTripUpdatesClient(request);
                let cacheService = null;
                try {
                    cacheService = getCacheService(request);
                } catch (error) {
                    logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                    cacheService = null;
                }
                const tripId = request.params.tripId;
                const cacheKey = `${cacheKeyBase}:trip:${tripId}`;
                let trip;
                if (cacheService) {
                    trip = await cacheService.getOrSetCache({
                        cacheKey,
                        dbFetchFn: async () => {
                            const result = await db.queries.getTripById(tripId);
                            return result && result[0] ? result[0] : null;
                        },
                        serialize: JSON.stringify,
                        deserialize: JSON.parse
                    });
                } else {
                    logger.warn('Cache service not available, fetching trip directly from database for tripId: ' + tripId);
                    const result = await db.queries.getTripById(tripId);
                    trip = result && result[0] ? result[0] : null;
                }
                if (!trip) {
                    return handler.response({ error: `Trip with ID ${tripId} not found` }).code(404);
                }
                let payload = {
                    db_last_updated: dbLastUpdated,
                    response: trip
                };
                payload = await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
                payload = await realtimeTripUpdates.queryProcessor.updateTripWithRealtimeUpdates(payload);
                return handler.response(payload);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
