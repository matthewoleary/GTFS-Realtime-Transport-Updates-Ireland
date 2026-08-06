import Joi from 'joi';
import ServerLogger from '../../serverLogger.js';
import { getCacheService, getDatabaseClient } from '../index.js';
import { createCacheableResponse, createRevisionValidator } from './cacheableResponse.js';
import { routeIdSchema } from './routeIdSchema.js';
import { getRoutePatternCatalog, publicRoutePatternCatalog } from '../services/routePatternsService.js';

export default function getRouteStops(server) {
    const logger = new ServerLogger({ client: 'getRouteStops' });
    server.route({
        method: 'GET',
        path: '/api/routes/{routeId}/stops',
        options: { validate: { params: Joi.object({ routeId: routeIdSchema }) } },
        handler: async (request, handler) => {
            try {
                const db = getDatabaseClient(request);
                const { routeId } = request.params;
                const route = await db.queries.getRouteById(routeId);
                if (!route?.length) return handler.response({ error: 'Route not found' }).code(404);
                const dbLastUpdated = db.lastDbUpdate || await db.getLastDbUpdate();
                const validator = createRevisionValidator(`routePatterns:${routeId}`, dbLastUpdated);
                const notModified = validator && handler.entity(validator);
                if (notModified) return notModified;
                let cacheService = null;
                try { cacheService = getCacheService(request); } catch {}
                const catalog = await getRoutePatternCatalog(db, cacheService, routeId);
                return createCacheableResponse(handler, {
                    db_last_updated: dbLastUpdated,
                    response: publicRoutePatternCatalog(catalog)
                }, validator);
            } catch (error) {
                logger.error(error);
                return handler.response({ error: 'Internal Server Error' }).code(500);
            }
        }
    });
}
