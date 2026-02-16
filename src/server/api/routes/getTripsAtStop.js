import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam, removeTripsAtLastStop, buildServiceDay } from './utils.js';
import { getDatabaseClient, getRealtimeTripUpdatesClient, getRealtimeVehiclePositionsClient } from '../index.js';
import { getCurrentTimestamp, getUnixTimestamp, getTimestampMinusNumberMinutes, getTimestampPlusNumberMinutes, checkIfNightServices, getWrappedTimestamp, getUnwrappedTimestamp } from '../../../utils/timestampUtils.js';
import { getCurrentDay, getCurrentDate, getPreviousDay, getPreviousDate, getNextDay, getNextDayDate } from '../../../utils/dateUtils.js';

/**
 * Registers the /api/tripsAtStop GET route for fetching GTFS trip data at specific stop(s).
 *
 * - Accepts a required `stopId` query parameter (string or array, comma-separated supported) for one or more stop IDs.
 * - Returns trips at the specified stop(s), including real-time updates and handling night services.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getTripsAtStopRoute(server) {
    const logger = new ServerLogger({ client: 'getTripsAtStopRoute' });
    server.route({
        method: 'GET',
        path: '/api/tripsAtStop',
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const realtimeTripUpdates = getRealtimeTripUpdatesClient(request);
                const realtimeVehiclePositions = getRealtimeVehiclePositionsClient(request);
                const stopIdParam = request.query.stopId;
                if (!stopIdParam) {
                    return handler.response({ error: 'stopId query parameter is required' }).code(400);
                }
                const stopIds = extractIdsFromParam(stopIdParam);
                // Allow search window bounds to be set via query parameters, defaulting to 90 if not provided
                const scheduleSearchWindowLowerBound = request.query.lowerBoundMinutes !== undefined
                    ? Number(request.query.lowerBoundMinutes)
                    : 90;
                const scheduleSearchWindowUpperBound = request.query.upperBoundMinutes !== undefined
                    ? Number(request.query.upperBoundMinutes)
                    : 90;
                // const upperLimitTimestamp = request.query.upperLimitTimestamp ? Number(request.query.upperLimitTimestamp) : null;
                const currentTimestamp = getCurrentTimestamp();
                const unixTimestamp = getUnixTimestamp();
                // Lower bound limited to 0 if subtraction goes negative
                const querySearchLowerBoundTimestamp = getTimestampMinusNumberMinutes(currentTimestamp, scheduleSearchWindowLowerBound);
                const querySearchUpperBoundTimestamp = getTimestampPlusNumberMinutes(currentTimestamp, scheduleSearchWindowUpperBound);
                const querySearchUpperBoundTimestampUnWrapped = getUnwrappedTimestamp(querySearchUpperBoundTimestamp);

                if (!realtimeTripUpdates) {
                    throw new Error('Realtime plugin is not registered or not available');
                }

                if (!db) {
                    throw new Error('Database client is not available');
                }

                let payload = {
                    since_midnight_timestamp: currentTimestamp,
                    query_timestamp: unixTimestamp,
                    response: []
                };

                const scheduleDay = getCurrentDay().toLowerCase();
                const scheduleDate = getCurrentDate();

                // Get max departure time of previous service day for night services check
                const maxDepartureTimestamp = await db.queries.getMaximumDepartureTimestamp(scheduleDay, scheduleDate);
                const maxDepartureTimestampUnwrapped = getUnwrappedTimestamp(maxDepartureTimestamp);

                // HANDLING NIGHT SERVICES
                // If the current timestamp is on or after midnight, before the timestamp of the final departure of the previous service day 
                // (i.e passes the night services check)
                if (checkIfNightServices(currentTimestamp, maxDepartureTimestampUnwrapped)) {
                    // Prepare the previous service day with the lower bound timestamp, current timestamp and upper bound timestamp wrapped.
                    // example: trips 90 mins before current time up to 90 minutes after the current time.
                    const previousScheduleDay = getPreviousDay().toLowerCase();
                    const previousScheduleDate = getPreviousDate();
                    const wrappedLowerBoundTimestamp = getWrappedTimestamp(querySearchLowerBoundTimestamp, maxDepartureTimestampUnwrapped);
                    const wrappedUpperBoundTimestamp = getWrappedTimestamp(querySearchUpperBoundTimestamp, maxDepartureTimestampUnwrapped);
                    // Search the previous service day with the lower bound timestamp wrapped and upper bound timestamp wrapped.
                    const wrappedServiceDay = buildServiceDay(previousScheduleDay, previousScheduleDate, wrappedLowerBoundTimestamp, wrappedUpperBoundTimestamp);
                    // Search the current service day with the lower bound timestamp and upper bound timestamp, both unwrapped.
                    const unwrappedServiceDay = buildServiceDay(scheduleDay, scheduleDate, querySearchLowerBoundTimestamp, querySearchUpperBoundTimestamp);
                    const result = await getTripsWithMidnightServices({
                        db, stopIds, realtimeTripUpdates, realtimeVehiclePositions, payload, wrappedServiceDay, unwrappedServiceDay
                    });
                    // Return all trips from both of those searches.
                    return handler.response(result);
                }

                // If the current timestamp is before midnight, but the upper bound for the search goes after midnight 
                // (example, 90 minutes after 11pm)
                if (checkIfNightServices(querySearchUpperBoundTimestampUnWrapped, maxDepartureTimestampUnwrapped)) {
                    // Current and next service day, both wrapped and unwrapped
                    const nextScheduleDay = getNextDay().toLowerCase();
                    const nextScheduleDate = getNextDayDate();
                    const wrappedLowerBoundTimestamp = getWrappedTimestamp(querySearchLowerBoundTimestamp, maxDepartureTimestampUnwrapped);
                    const wrappedUpperBoundTimestamp = getWrappedTimestamp(querySearchUpperBoundTimestamp, maxDepartureTimestampUnwrapped);
                    // Search the current service day with the lower bound timestamp wrapped and upper bound timestamp wrapped.
                    const wrappedServiceDay = buildServiceDay(scheduleDay, scheduleDate, wrappedLowerBoundTimestamp, wrappedUpperBoundTimestamp);
                    // Search the next service day with lower bound of 0 (midnight) up to the unwrapped upper bound.
                    const unwrappedServiceDay = buildServiceDay(nextScheduleDay, nextScheduleDate, 0, querySearchUpperBoundTimestamp);
                    const result = await getTripsWithMidnightServices({
                        db, stopIds, realtimeTripUpdates, realtimeVehiclePositions, payload, wrappedServiceDay, unwrappedServiceDay
                    });
                    return handler.response(result);
                }

                // NO NIGHT SERVICES
                // If both lower and upper bounds of the search window fall within the same day, search for trips as normal.
                const serviceDay = buildServiceDay(scheduleDay, scheduleDate, querySearchLowerBoundTimestamp, querySearchUpperBoundTimestamp);
                const result = await getTrips({
                    db,
                    stopIds,
                    realtimeTripUpdates,
                    realtimeVehiclePositions,
                    payload,
                    serviceDay
                });

                return handler.response(result);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}

// This function handles fetching trips that may include midnight services
// It will search across two provided service dates and days to ensure all relevant trips are included.
async function getTripsWithMidnightServices({
    db,
    stopIds,
    realtimeTripUpdates,
    realtimeVehiclePositions,
    payload,
    wrappedServiceDay,
    unwrappedServiceDay
}) {
    for (const stopId of stopIds) {
        const response = await db.queries.getTripsAtStopIdWithNightServices({
            stopId,
            wrappedServiceDay,
            unwrappedServiceDay
        });
        const lastStops = await db.queries.getLastStops(response);
        const filteredTrips = await removeTripsAtLastStop(lastStops, response);
        payload.response.push(...filteredTrips);
    }
    await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
    return await realtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates(payload);
}

async function getTrips({
    db,
    stopIds,
    realtimeTripUpdates,
    realtimeVehiclePositions,
    payload,
    serviceDay
}) {
    for (const stopId of stopIds) {
        const response = await db.queries.getTripsAtStopId({
            stopId,
            serviceDay
        });
        const lastStops = await db.queries.getLastStops(response);
        const filteredTrips = await removeTripsAtLastStop(lastStops, response);
        payload.response.push(...filteredTrips);
    }
    await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
    return await realtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates(payload); 
}
