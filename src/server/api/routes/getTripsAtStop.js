import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam, removeTripsAtLastStop, buildServiceDay } from './utils.js';
import { getDatabaseClient, getRealtimeTripUpdatesClient, getRealtimeVehiclePositionsClient, getCacheService } from '../index.js';
import { getSecondsSinceMidnightTimestamp, getUnixTimestamp, getTimestampMinusNumberMinutes, getTimestampPlusNumberMinutes, checkIfNightServices, getWrappedTimestamp, getUnwrappedTimestamp } from '../../../utils/timestampUtils.js';
import { getCurrentDay, getCurrentDate, getPreviousDay, getPreviousDate, getNextDay, getNextDayDate } from '../../../utils/dateUtils.js';

/**
 * Registers the /api/stops/{stopId}/trips GET route for fetching GTFS trip data at a specific stop.
 *
 * - Accepts a required `stopId` path parameter for the stop ID.
 * - Optionally accepts `lowerBoundMinutes` and `upperBoundMinutes` query parameters to define the time window (default: ±90 minutes).
 * - Returns all trips at the specified stop, including real-time updates and handling night services (spanning two service days).
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client and supports caching.
 *
 * Example endpoint: /api/stops/{stopId}/trips?lowerBoundMinutes=60&upperBoundMinutes=120
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getTripsAtStop(server) {
    server.route({
        method: 'GET',
        path: '/api/stops/{stopId}/trips',
        handler: async (request, handler) => {
            const logger = new ServerLogger({ client: 'getTripsAtStop' });
            const db = getDatabaseClient(request);
            let cacheService = null;
            try {
                cacheService = getCacheService(request);
            } catch (error) {
                logger.warn('Cache service not available or failed to initialize, proceeding without cache. Error: ' + error.message);
                cacheService = null;
            }
            const service = new TripsAtStopService({ dbClient: db, cacheService, logger });
            try {
                const realtimeTripUpdates = getRealtimeTripUpdatesClient(request);
                const realtimeVehiclePositions = getRealtimeVehiclePositionsClient(request);
                const { stopId } = request.params;
                if (!stopId) {
                    return handler.response({ error: 'stopId path parameter is required' }).code(400);
                }
                // Optionally support query params for time window
                const scheduleSearchWindowLowerBound = request.query.lowerBoundMinutes !== undefined
                    ? Number(request.query.lowerBoundMinutes)
                    : 90;
                const scheduleSearchWindowUpperBound = request.query.upperBoundMinutes !== undefined
                    ? Number(request.query.upperBoundMinutes)
                    : 90;
                const unixTimestamp = getUnixTimestamp();
                const secondsSinceMidnightTimestamp = getSecondsSinceMidnightTimestamp(unixTimestamp);
                const querySearchLowerBoundTimestamp = getTimestampMinusNumberMinutes(secondsSinceMidnightTimestamp, scheduleSearchWindowLowerBound);
                const querySearchUpperBoundTimestamp = getTimestampPlusNumberMinutes(secondsSinceMidnightTimestamp, scheduleSearchWindowUpperBound);
                const querySearchUpperBoundTimestampUnWrapped = getUnwrappedTimestamp(querySearchUpperBoundTimestamp);

                if (!realtimeTripUpdates) {
                    throw new Error('Realtime plugin is not registered or not available');
                }
                if (!db) {
                    throw new Error('Database client is not available');
                }

                let payload = {
                    query_timestamp: unixTimestamp,
                    response: []
                };

                const scheduleDay = getCurrentDay().toLowerCase();
                const scheduleDate = getCurrentDate();

                const maxDepartureTimestamp = await service.getMaximumDepartureTimestampWithCache({
                    scheduleDay,
                    scheduleDate
                });
                const maxDepartureTimestampUnwrapped = getUnwrappedTimestamp(maxDepartureTimestamp);

                if (checkIfNightServices(secondsSinceMidnightTimestamp, maxDepartureTimestampUnwrapped)) {
                    const previousScheduleDay = getPreviousDay().toLowerCase();
                    const previousScheduleDate = getPreviousDate();
                    const wrappedLowerBoundTimestamp = getWrappedTimestamp(querySearchLowerBoundTimestamp, maxDepartureTimestampUnwrapped);
                    const wrappedUpperBoundTimestamp = getWrappedTimestamp(querySearchUpperBoundTimestamp, maxDepartureTimestampUnwrapped);
                    const wrappedServiceDay = buildServiceDay(previousScheduleDay, previousScheduleDate, wrappedLowerBoundTimestamp, wrappedUpperBoundTimestamp);
                    const unwrappedServiceDay = buildServiceDay(scheduleDay, scheduleDate, querySearchLowerBoundTimestamp, querySearchUpperBoundTimestamp);
                    const result = await service.getTripsWithMidnightServices({
                        stopId, realtimeTripUpdates, realtimeVehiclePositions, payload, wrappedServiceDay, unwrappedServiceDay
                    });
                    return handler.response(result);
                }

                if (checkIfNightServices(querySearchUpperBoundTimestampUnWrapped, maxDepartureTimestampUnwrapped)) {
                    const nextScheduleDay = getNextDay().toLowerCase();
                    const nextScheduleDate = getNextDayDate();
                    const wrappedLowerBoundTimestamp = getWrappedTimestamp(querySearchLowerBoundTimestamp, maxDepartureTimestampUnwrapped);
                    const wrappedUpperBoundTimestamp = getWrappedTimestamp(querySearchUpperBoundTimestamp, maxDepartureTimestampUnwrapped);
                    const wrappedServiceDay = buildServiceDay(scheduleDay, scheduleDate, wrappedLowerBoundTimestamp, wrappedUpperBoundTimestamp);
                    const unwrappedServiceDay = buildServiceDay(nextScheduleDay, nextScheduleDate, 0, querySearchUpperBoundTimestamp);
                    const result = await service.getTripsWithMidnightServices({
                        stopId, realtimeTripUpdates, realtimeVehiclePositions, payload, wrappedServiceDay, unwrappedServiceDay
                    });
                    return handler.response(result);
                }

                const serviceDay = buildServiceDay(scheduleDay, scheduleDate, querySearchLowerBoundTimestamp, querySearchUpperBoundTimestamp);
                const result = await service.getTrips({
                    stopId,
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

/**
 * Service class for fetching and caching GTFS trip data at stops, including night services and real-time updates.
 *
 * Responsibilities:
 * - Fetches trips at a stop for a given time window and service day, using cache and DB as needed.
 * - Handles special logic for night services (spanning two service days).
 * - Updates trip results with real-time vehicle positions and trip updates.
 * - Fetches last stops for trips and the maximum departure timestamp for a service day.
 * - Encapsulates all cache and DB logic for trips, last stops, and maximum departure timestamps.
 */
export class TripsAtStopService {
    /**
     * Constructs a TripsAtStopService instance for fetching and caching GTFS trip data at stops.
     *
     * @param {Object} params
     * @param {Object} params.cacheService - CacheService instance for caching (required).
     * @param {Object} params.dbClient - Database client instance for queries.
     * @param {Object} params.logger - Logger instance for logging events and errors.
     */
    constructor({ cacheService, dbClient, logger }) {
        this.db = dbClient;
        this.logger = logger;
        this.cacheService = cacheService;
    }

    /**
     * Fetches trips at stop(s) for night services (spanning two service days), using cache and DB as needed, and updates with real-time data.
     *
     * @param {Object} params
     * @param {string} params.stopId - stop ID to fetch trips for.
     * @param {Object} params.realtimeTripUpdates - Real-time trip updates client (must have queryProcessor).
     * @param {Object} params.realtimeVehiclePositions - Real-time vehicle positions client (must have queryProcessor).
     * @param {Object} params.payload - Response payload object to be populated (mutated in-place).
     * @param {Object} params.wrappedServiceDay - Service day object for previous/next day (night service window).
     * @param {Object} params.unwrappedServiceDay - Service day object for current day (night service window).
     * @returns {Promise<Object>} Updated payload with trips and real-time data.
     */
    async getTripsWithMidnightServices(
        stopId,
        realtimeTripUpdates,
        realtimeVehiclePositions,
        payload,
        wrappedServiceDay,
        unwrappedServiceDay
    ) {
        const response = await this.getTripsAtStopIdWithNightServicesWithCache(stopId, wrappedServiceDay, unwrappedServiceDay);
        const lastStops = await this.getLastStopsWithCache(response);
        const filteredTrips = await removeTripsAtLastStop(lastStops, response);
        payload.response.push(...filteredTrips);
        await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
        return await realtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates(payload);
    }

    /**
     * Fetches trips at stop(s) for a given service day, using cache and DB as needed, and updates with real-time data.
     *
     * @param {Object} params
     * @param {string} params.stopId - Stop ID to fetch trips for.
     * @param {Object} params.realtimeTripUpdates - Real-time trip updates client (must have queryProcessor).
     * @param {Object} params.realtimeVehiclePositions - Real-time vehicle positions client (must have queryProcessor).
     * @param {Object} params.payload - Response payload object to be populated (mutated in-place).
     * @param {Object} params.serviceDay - Service day object for the query window.
     * @returns {Promise<Object>} Updated payload with trips and real-time data.
     */
    async getTrips(
        stopId,
        realtimeTripUpdates,
        realtimeVehiclePositions,
        payload,
        serviceDay
    ) {
        const response = await this.getTripsAtStopIdWithCache( stopId, serviceDay );
        const lastStops = await this.getLastStopsWithCache(response);
        const filteredTrips = await removeTripsAtLastStop(lastStops, response);
        payload.response.push(...filteredTrips);
        await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
        return await realtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates(payload);
    }

    /**
     * Fetches trips at a stop for a given service day, using cache and DB as needed.
     *
     * - Uses a cache key of the form `tripsAtStopId:<stopId>:<dayColumn>:<date>:<lowerBoundTimestamp>:<upperBoundTimestamp>`.
     * - Serializes and deserializes trip arrays as JSON.
     *
     * @param {string} stopId - Stop ID to fetch trips for.
     * @param {Object} serviceDay - Service day object for the query window.
     * @returns {Promise<Object[]>} Array of trip objects for the stop and service day.
     */
    async getTripsAtStopIdWithCache(stopId, serviceDay) {
        const cacheKey = `tripsAtStopId:${stopId}:${serviceDay.dayColumn}:${serviceDay.date}:${serviceDay.lowerBoundTimestamp}:${serviceDay.upperBoundTimestamp}`;
        if (this.cacheService) {
            return this.cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: () => this.db.queries.getTripsAtStopId(stopId, serviceDay),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            return this.db.queries.getTripsAtStopId(stopId, serviceDay);
        }
    }

    /**
     * Fetches trips at a stop for a night service window (spanning two service days), using cache and DB as needed.
     *
     * - Uses a cache key of the form `tripsAtStopIdWithNightServices:<stopId>:...` (with all service day params).
     * - Serializes and deserializes trip arrays as JSON.
     *
     * @param {string} stopId - Stop ID to fetch trips for.
     * @param {Object} wrappedServiceDay - Service day object for previous/next day (night service window).
     * @param {Object} unwrappedServiceDay - Service day object for current day (night service window).
     * @returns {Promise<Object[]>} Array of trip objects for the stop and night service window.
     */
    async getTripsAtStopIdWithNightServicesWithCache(stopId, wrappedServiceDay, unwrappedServiceDay) {
        const cacheKey = `tripsAtStopIdWithNightServices:${stopId}` +
            `:${wrappedServiceDay.dayColumn}` +
            `:${wrappedServiceDay.date}` +
            `:${wrappedServiceDay.lowerBoundTimestamp}` +
            `:${wrappedServiceDay.upperBoundTimestamp}` +
            `:${unwrappedServiceDay.dayColumn}` +
            `:${unwrappedServiceDay.date}` +
            `:${unwrappedServiceDay.lowerBoundTimestamp}` +
            `:${unwrappedServiceDay.upperBoundTimestamp}`;
        if (this.cacheService) {
            return this.cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: () => this.db.queries.getTripsAtStopIdWithNightServices(stopId, wrappedServiceDay, unwrappedServiceDay),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            return this.db.queries.getTripsAtStopIdWithNightServices(stopId, wrappedServiceDay, unwrappedServiceDay);
        }
    }

    /**
     * Fetches the last stops for a set of trips, using cache and DB as needed.
     *
     * - Uses a cache key of the form `lastStops:<trip_id,trip_id,...>`.
     * - Serializes and deserializes last stop arrays as JSON.
     *
     * @param {Object[]} trips - Array of trip objects to fetch last stops for.
     * @returns {Promise<Object[]>} Array of last stop objects for the given trips.
     */
    async getLastStopsWithCache(trips) {
        const cacheKey = `lastStops:${trips.map(trip => trip.trip_id).join(',')}`;
        if (this.cacheService) {
            return this.cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: () => this.db.queries.getLastStops(trips),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            return this.db.queries.getLastStops(trips);
        }
    }

    /**
     * Fetches the maximum departure timestamp for a given schedule day and date, using cache and DB as needed.
     *
     * - Uses a cache key of the form `maxDepartureTimestamp:<scheduleDay>:<scheduleDate>`.
     * - Serializes values as strings for storage in cache.
     * - Deserializes using a function that parses the value as a number and returns null if the result is NaN.
     *   This ensures that corrupted or non-numeric cache entries are treated as cache misses.
     *
     * @param {string} scheduleDay - Schedule day (e.g., 'monday').
     * @param {string} scheduleDate - Schedule date (YYYYMMDD).
     * @returns {Promise<number|null>} Maximum departure timestamp, or null if not available or cache is corrupt.
     */
    async getMaximumDepartureTimestampWithCache(scheduleDay, scheduleDate) {
        const cacheKey = `maxDepartureTimestamp:${scheduleDay}:${scheduleDate}`;
        if (this.cacheService) {
            return this.cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: () => this.db.queries.getMaximumDepartureTimestamp(scheduleDay, scheduleDate),
                serialize: String,
                /**
                 * Deserializes the cached value as a number. Returns null if the value is not a valid number (NaN).
                 * @param {string} value - Cached value from Redis
                 * @returns {number|null}
                 */
                deserialize: (value) => {
                    const parsedValue = Number(value);
                    return Number.isNaN(parsedValue) ? null : parsedValue;
                }
            });
        } else {
            return this.db.queries.getMaximumDepartureTimestamp(scheduleDay, scheduleDate);
        }
    }
}