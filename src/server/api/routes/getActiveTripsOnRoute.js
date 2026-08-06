import Joi from 'joi';
import ServerLogger from '../../serverLogger.js';
import {
    getCacheService,
    getDatabaseClient,
    getRealtimeTripUpdatesClient,
    getRealtimeVehiclePositionsClient
} from '../index.js';
import { getRoutePatternCatalog } from '../services/routePatternsService.js';
import { routeIdSchema } from './routeIdSchema.js';

export default function getActiveTripsOnRoute(server) {
    const logger = new ServerLogger({ client: 'getActiveTripsOnRoute' });
    server.route({
        method: 'GET',
        path: '/api/routes/{routeId}/activeTrips',
        options: {
            validate: {
                params: Joi.object({ routeId: routeIdSchema }),
                query: Joi.object({
                    vehiclePositionsOnly: Joi.boolean().default(false)
                })
            }
        },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const { routeId } = request.params;
                const route = await db.queries.getRouteById(routeId);
                if (!route?.length) return handler.response({ error: 'Route not found' }).code(404);

                const tripUpdates = getRealtimeTripUpdatesClient(request);
                const vehiclePositions = getRealtimeVehiclePositionsClient(request);
                const [tripUpdateMap, vehicleMap] = await Promise.all([
                    tripUpdates?.getFeedTripIdMap?.(),
                    vehiclePositions?.getFeedTripIdMap?.()
                ]);
                const activeTripIds = request.query?.vehiclePositionsOnly
                    ? new Set(vehicleMap?.keys?.() || [])
                    : new Set([
                        ...(tripUpdateMap?.keys?.() || []),
                        ...(vehicleMap?.keys?.() || [])
                    ]);
                const scheduledTrips = await db.queries.getTripsByRouteId(routeId);
                let cacheService = null;
                try { cacheService = getCacheService(request); } catch {}
                const catalog = await getRoutePatternCatalog(db, cacheService, routeId);
                let payload = {
                    response: scheduledTrips
                        .filter(trip => activeTripIds.has(trip.trip_id))
                        .map(trip => ({
                            ...trip,
                            pattern_id: catalog.trip_pattern_ids[trip.trip_id] || null
                        }))
                };
                if (!request.query?.vehiclePositionsOnly
                    && tripUpdates?.queryProcessor?.updateTripWithRealtimeUpdates) {
                    payload = await tripUpdates.queryProcessor.updateTripWithRealtimeUpdates(payload);
                }
                if (vehiclePositions?.queryProcessor?.updateResultsWithRealtimeVehiclePositions) {
                    payload = await vehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
                }
                return handler.response(payload).header('Cache-Control', 'no-store');
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
