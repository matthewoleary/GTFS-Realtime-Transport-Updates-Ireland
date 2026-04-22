import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam, removeTripsAtLastStop, buildServiceDay } from './utils.js';
import { getDatabaseClient, getRealtimeTripUpdatesClient, getRealtimeVehiclePositionsClient, getCacheService } from '../index.js';
import { getSecondsSinceMidnightTimestamp, getUnixTimestamp, getTimestampMinusNumberMinutes, getTimestampPlusNumberMinutes, checkIfNightServices, getWrappedTimestamp, getUnwrappedTimestamp } from '../../../utils/timestampUtils.js';
import { CacheService } from '../../../services/cache/cacheService.js';
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
export default function getTripsAtStop(server) {
    server.route({
        method: 'GET',
        path: '/api/tripsAtStop',
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
                const stopIdParam = request.query.stopId;
                if (!stopIdParam) {
                    return handler.response({ error: 'stopId query parameter is required' }).code(400);
                }
                const stopIds = extractIdsFromParam(stopIdParam);
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
                        stopIds, realtimeTripUpdates, realtimeVehiclePositions, payload, wrappedServiceDay, unwrappedServiceDay
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
                        stopIds, realtimeTripUpdates, realtimeVehiclePositions, payload, wrappedServiceDay, unwrappedServiceDay
                    });
                    return handler.response(result);
                }

                const serviceDay = buildServiceDay(scheduleDay, scheduleDate, querySearchLowerBoundTimestamp, querySearchUpperBoundTimestamp);
                const result = await service.getTrips({
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

/**
 * Service class for fetching and caching GTFS trip data at stops, including night services and real-time updates.
 * Encapsulates all cache and DB logic for trips, last stops, and maximum departure timestamps.
 */
export class TripsAtStopService {
    /**
     * Constructs a TripsAtStopService instance for fetching and caching GTFS trip data at stops.
     *
     * @param {Object} params
     * @param {Object} params.redisClient - Redis client instance for caching (optional).
     * @param {Object} params.dbClient - Database client instance for queries.
     * @param {Object} params.logger - Logger instance for logging events and errors.
     */
    constructor({ redisClient, dbClient, logger }) {
        this.db = dbClient;
        this.logger = logger;
        this.cacheService = new CacheService({ redisClient: redisClient, logger: this.logger });
    }

    /**
     * Fetches trips at stop(s) for night services (spanning two service days), using cache and DB as needed, and updates with real-time data.
     *
     * @param {Object} params
     * @param {string[]} params.stopIds - Array of stop IDs to fetch trips for.
     * @param {Object} params.realtimeTripUpdates - Real-time trip updates client (must have queryProcessor).
     * @param {Object} params.realtimeVehiclePositions - Real-time vehicle positions client (must have queryProcessor).
     * @param {Object} params.payload - Response payload object to be populated (mutated in-place).
     * @param {Object} params.wrappedServiceDay - Service day object for previous/next day (night service window).
     * @param {Object} params.unwrappedServiceDay - Service day object for current day (night service window).
     * @returns {Promise<Object>} Updated payload with trips and real-time data.
     */
    async getTripsWithMidnightServices({
        stopIds,
        realtimeTripUpdates,
        realtimeVehiclePositions,
        payload,
        wrappedServiceDay,
        unwrappedServiceDay
    }) {
        for (const stopId of stopIds) {
            const response = await this.getTripsAtStopIdWithNightServicesWithCache({
                stopId,
                wrappedServiceDay,
                unwrappedServiceDay
            });
            const lastStops = await this.getLastStopsWithCache(response);
            const filteredTrips = await removeTripsAtLastStop(lastStops, response);
            payload.response.push(...filteredTrips);
        }
        await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
        return await realtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates(payload);
    }

    /**
     * Fetches trips at stop(s) for a given service day, using cache and DB as needed, and updates with real-time data.
     *
     * @param {Object} params
     * @param {string[]} params.stopIds - Array of stop IDs to fetch trips for.
     * @param {Object} params.realtimeTripUpdates - Real-time trip updates client (must have queryProcessor).
     * @param {Object} params.realtimeVehiclePositions - Real-time vehicle positions client (must have queryProcessor).
     * @param {Object} params.payload - Response payload object to be populated (mutated in-place).
     * @param {Object} params.serviceDay - Service day object for the query window.
     * @returns {Promise<Object>} Updated payload with trips and real-time data.
     */
    async getTrips({
        stopIds,
        realtimeTripUpdates,
        realtimeVehiclePositions,
        payload,
        serviceDay
    }) {
        for (const stopId of stopIds) {
            const response = await this.getTripsAtStopIdWithCache({ stopId, serviceDay });
            const lastStops = await this.getLastStopsWithCache(response);
            const filteredTrips = await removeTripsAtLastStop(lastStops, response);
            payload.response.push(...filteredTrips);
        }
        await realtimeVehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions(payload);
        return await realtimeTripUpdates.queryProcessor.updateResultsWithRealtimeTripUpdates(payload);
    }

    /**
     * Fetches trips at a stop for a given service day, using cache and DB as needed.
     *
     * - Uses a cache key of the form `tripsAtStopId:<stopId>:<dayColumn>:<date>:<lowerBoundTimestamp>:<upperBoundTimestamp>`.
     * - Serializes and deserializes trip arrays as JSON.
     *
     * @param {Object} params
     * @param {string} params.stopId - Stop ID to fetch trips for.
     * @param {Object} params.serviceDay - Service day object for the query window.
     * @returns {Promise<Object[]>} Array of trip objects for the stop and service day.
     */
    async getTripsAtStopIdWithCache({ stopId, serviceDay }) {
        const cacheKey = `tripsAtStopId:${stopId}:${serviceDay.dayColumn}:${serviceDay.date}:${serviceDay.lowerBoundTimestamp}:${serviceDay.upperBoundTimestamp}`;
        return this.cacheService.getOrSetCache({
            cacheKey,
            dbFetchFn: () => this.db.queries.getTripsAtStopId({ stopId, serviceDay }),
            serialize: JSON.stringify,
            deserialize: JSON.parse
        });
    }

    /**
     * Fetches trips at a stop for a night service window (spanning two service days), using cache and DB as needed.
     *
     * - Uses a cache key of the form `tripsAtStopIdWithNightServices:<stopId>:...` (with all service day params).
     * - Serializes and deserializes trip arrays as JSON.
     *
     * @param {Object} params
     * @param {string} params.stopId - Stop ID to fetch trips for.
     * @param {Object} params.wrappedServiceDay - Service day object for previous/next day (night service window).
     * @param {Object} params.unwrappedServiceDay - Service day object for current day (night service window).
     * @returns {Promise<Object[]>} Array of trip objects for the stop and night service window.
     */
    async getTripsAtStopIdWithNightServicesWithCache({ stopId, wrappedServiceDay, unwrappedServiceDay }) {
        const cacheKey = `tripsAtStopIdWithNightServices:${stopId}` +
            `:${wrappedServiceDay.dayColumn}` +
            `:${wrappedServiceDay.date}` +
            `:${wrappedServiceDay.lowerBoundTimestamp}` +
            `:${wrappedServiceDay.upperBoundTimestamp}` +
            `:${unwrappedServiceDay.dayColumn}` +
            `:${unwrappedServiceDay.date}` +
            `:${unwrappedServiceDay.lowerBoundTimestamp}` +
            `:${unwrappedServiceDay.upperBoundTimestamp}`;
        return this.cacheService.getOrSetCache({
            cacheKey,
            dbFetchFn: () => this.db.queries.getTripsAtStopIdWithNightServices({ stopId, wrappedServiceDay, unwrappedServiceDay }),
            serialize: JSON.stringify,
            deserialize: JSON.parse
        });
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
        return this.cacheService.getOrSetCache({
            cacheKey,
            dbFetchFn: () => this.db.queries.getLastStops(trips),
            serialize: JSON.stringify,
            deserialize: JSON.parse
        });
    }

    /**
     * Fetches the maximum departure timestamp for a given schedule day and date, using cache and DB as needed.
     *
     * - Uses a cache key of the form `maxDepartureTimestamp:<scheduleDay>:<scheduleDate>`.
     * - Serializes values as strings for storage in cache.
     * - Deserializes using a function that parses the value as a number and returns null if the result is NaN.
     *   This ensures that corrupted or non-numeric cache entries are treated as cache misses.
     *
     * @param {Object} params
     * @param {string} params.scheduleDay - Schedule day (e.g., 'monday').
     * @param {string} params.scheduleDate - Schedule date (YYYYMMDD).
     * @returns {Promise<number|null>} Maximum departure timestamp, or null if not available or cache is corrupt.
     */
    async getMaximumDepartureTimestampWithCache({ scheduleDay, scheduleDate }) {
        const cacheKey = `maxDepartureTimestamp:${scheduleDay}:${scheduleDate}`;
        return this.cacheService.getOrSetCache({
            cacheKey,
            dbFetchFn: () => this.db.queries.getMaximumDepartureTimestamp({ scheduleDay, scheduleDate }),
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
    }
}