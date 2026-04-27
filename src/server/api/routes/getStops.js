import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getCacheService } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';
import { CacheService } from '../../../services/cache/cacheService.js';

/**
 * Registers the /api/stops GET route for fetching GTFS stop data.
 *
 * Query Parameters:
 * - `stopId` (string | array, optional):
 *     - If provided, returns details for the specified stop(s) only.
 *     - Accepts a single stop ID, a comma-separated list, or multiple stopId parameters.
 * - `agencyId` (string, optional):
 *     - If provided (and stopId is not), returns all stops for the specified agency.
 *     - If both stopId and agencyId are provided, only stopId is used.
 *
 * Behavior:
 * - If neither parameter is provided, returns all stops.
 * - Adds `query_timestamp` to the response payload for client-side reference.
 * - Uses Redis for caching at the stop, agency, and all-stops levels. Handles corrupted cache entries gracefully.
 *
 * Response Example:
 * {
 *   query_timestamp: <number>,
 *   response: [ { stop_id, ... }, ... ]
 * }
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getStops(server) {
    const logger = new ServerLogger({ client: 'getStops' });
    const cacheKeyBase = 'stops';

    /**
     * Retrieves stop details for a list of stop IDs, using Redis cache if available.
     * Falls back to the database and updates the cache on miss or corruption.
     *
     * @param {string[]} stopIds - Array of stop IDs to fetch.
     * @param {object} db - Database client with queries.
     * @param {object|null} cacheService - Cache service instance or null.
     * @param {string} cacheKeyBase - Base string for cache key construction.
     * @returns {Promise<object[]>} Array of stop objects.
     */
    async function getStopsByIds(stopIds, db, cacheService, cacheKeyBase) {
        const response = [];
        for (const id of stopIds) {
            const cacheKey = `${cacheKeyBase}:stop:${id}`;
            let stop;
            if (cacheService) {
                stop = await cacheService.getOrSetCache({
                    cacheKey,
                    dbFetchFn: async () => {
                        const result = await db.queries.getStopById(id);
                        return result && result[0] ? result[0] : null;
                    },
                    serialize: JSON.stringify,
                    deserialize: JSON.parse
                });
            } else {
                logger.warn('Cache service not available, fetching stop directly from database for stopId: ' + id);
                const result = await db.queries.getStopById(id);
                stop = result && result[0] ? result[0] : null;
            }
            if (stop) {
                response.push(stop);
            }
        }
        return response;
    }

    /**
     * Retrieves all stops for a given agency, using Redis cache if available.
     * Falls back to the database and updates the cache on miss or corruption.
     *
     * @param {string} agencyId - Agency ID to fetch stops for.
     * @param {object} db - Database client with queries.
     * @param {object|null} cacheService - Cache service instance or null.
     * @param {string} cacheKeyBase - Base string for cache key construction.
     * @returns {Promise<object[]>} Array of stop objects for the agency.
     */
    async function getStopsByAgencyId(agencyId, db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:agency:${agencyId}`;
        if (cacheService) {
            return await cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllStopsByAgencyId(agencyId),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            logger.warn('Cache service not available, fetching stops directly from database for agencyId: ' + agencyId);
            return await db.queries.getAllStopsByAgencyId(agencyId);
        }
    }

    /**
     * Retrieves all stops, using Redis cache if available.
     * Falls back to the database and updates the cache on miss or corruption.
     *
     * @param {object} db - Database client with queries.
     * @param {object|null} cacheService - Cache service instance or null.
     * @param {string} cacheKeyBase - Base string for cache key construction.
     * @returns {Promise<object[]>} Array of all stop objects.
     */
    async function getAllStops(db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:all`;
        if (cacheService) {
            return await cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllStops(),
                serialize: JSON.stringify,
                deserialize: JSON.parse
            });
        } else {
            logger.warn('Cache service not available, fetching all stops directly from database');
            return await db.queries.getAllStops();
        }
    }

    server.route({
        method: 'GET',
        path: '/api/stops',
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
                const agencyId = request.query.agencyId;
                const stopIdParam = request.query.stopId;
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (stopIdParam) {
                    const stopIds = extractIdsFromParam(stopIdParam);
                    response = await getStopsByIds(stopIds, db, cacheService, cacheKeyBase);
                } else if (agencyId) {
                    response = await getStopsByAgencyId(agencyId, db, cacheService, cacheKeyBase);
                } else {
                    response = await getAllStops(db, cacheService, cacheKeyBase);
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