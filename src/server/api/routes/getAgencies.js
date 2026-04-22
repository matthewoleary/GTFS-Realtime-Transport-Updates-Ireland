import ServerLogger from '../../serverLogger.js';
import { extractIdsFromParam } from './utils.js';
import { getDatabaseClient, getCacheService } from '../index.js';
import { getUnixTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Registers the /api/agencies GET route for fetching GTFS agency data.
 *
 * - If the optional `agencyId` query parameter is provided (as a string or array, comma-separated supported),
 *   returns details for the specified agency/agencies only.
 * - If `agencyId` is omitted, returns all agencies.
 * - Adds current and Unix timestamps to the response payload for client-side reference.
 * - Handles MySQL backend via the dynamic SQL client.
 *
 * @param {object} server - Hapi server instance to register the route on.
 * @returns {void}
 */
export default function getAgencies(server) {
    const logger = new ServerLogger({ client: 'getAgencies' });
    const cacheKeyBase = 'agencies';

    // Retrieves agency details for a list of agency IDs, using CacheService for cache logic.
    async function getAgenciesByIds(agencyIds, db, cacheService, cacheKeyBase) {
        const response = [];
        for (const id of agencyIds) {
            const cacheKey = `${cacheKeyBase}:agency:${id}`;
            let agency;
            if (cacheService) {
                agency = await cacheService.getOrSetCache({
                    cacheKey,
                    dbFetchFn: async () => {
                        const result = await db.queries.getAgencyById(id);
                        return result && result[0] ? result[0] : null;
                    },
                    serialize: JSON.stringify,
                    deserialize: (data) => {
                        try {
                            return JSON.parse(data);
                        } catch (err) {
                            // Let CacheService handle deletion and logging
                            throw err;
                        }
                    }
                });
            } else {
                logger.warn('Cache service not available, fetching agency directly from database for agencyId: ' + id);
                const result = await db.queries.getAgencyById(id);
                agency = result && result[0] ? result[0] : null;
            }
            if (agency) {
                response.push(agency);
            }
        }
        return response;
    }

    // Retrieves all agencies, using CacheService for cache logic.
    async function getAllAgenciesWithCache(db, cacheService, cacheKeyBase) {
        const cacheKey = `${cacheKeyBase}:all`;
        if (cacheService) {
            return cacheService.getOrSetCache({
                cacheKey,
                dbFetchFn: async () => await db.queries.getAllAgencies(),
                serialize: JSON.stringify,
                deserialize: (data) => {
                    try {
                        return JSON.parse(data);
                    } catch (err) {
                        throw err;
                    }
                }
            });
        } else {
            logger.warn('Cache service not available, fetching all agencies directly from database');
            return await db.queries.getAllAgencies();
        }
    }

    server.route({
        method: 'GET',
        path: '/api/agencies',
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
                const agencyIdParam = request.query.agencyId;
                const unixTimestamp = getUnixTimestamp();
                let response;
                if (agencyIdParam) {
                    const agencyIds = extractIdsFromParam(agencyIdParam);
                    response = await getAgenciesByIds(agencyIds, db, cacheService, cacheKeyBase);
                } else {
                    response = await getAllAgenciesWithCache(db, cacheService, cacheKeyBase);
                }
                if (!response || response.length === 0) {
                    return handler.response({ error: 'No agencies found' }).code(404);
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
