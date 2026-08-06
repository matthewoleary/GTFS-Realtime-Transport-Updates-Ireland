import { createHash } from 'node:crypto';

const patternId = value => `ptn_${createHash('sha256').update(value).digest('hex').slice(0, 12)}`;

const buildCatalog = async (db, routeId) => {
    const rows = await db.queries.getRoutePatternRows(routeId);
    const trips = new Map();
    for (const row of rows) {
        if (!trips.has(row.trip_id)) trips.set(row.trip_id, []);
        trips.get(row.trip_id).push(row);
    }

    const patternsByKey = new Map();
    const trip_pattern_ids = {};
    for (const [tripId, tripRows] of trips) {
        const first = tripRows[0];
        const signature = JSON.stringify({
            routeId,
            directionId: first.direction_id,
            shapeId: first.shape_id,
            stops: tripRows.map(row => [row.stop_id, row.pickup_type, row.drop_off_type])
        });
        if (!patternsByKey.has(signature)) {
            patternsByKey.set(signature, {
                pattern_id: patternId(signature),
                direction_id: first.direction_id,
                headsign: first.trip_headsign,
                shape_id: first.shape_id,
                stops: tripRows.map(row => ({
                    stop_id: row.stop_id,
                    stop_code: row.stop_code,
                    stop_name: row.stop_name,
                    stop_lat: row.stop_lat,
                    stop_lon: row.stop_lon,
                    stop_sequence: row.stop_sequence,
                    pickup_type: row.pickup_type,
                    drop_off_type: row.drop_off_type
                }))
            });
        }
        trip_pattern_ids[tripId] = patternsByKey.get(signature).pattern_id;
    }

    const patterns = [...patternsByKey.values()].sort((a, b) =>
        (a.direction_id ?? 0) - (b.direction_id ?? 0)
        || (a.headsign || '').localeCompare(b.headsign || '')
        || a.pattern_id.localeCompare(b.pattern_id)
    );
    const shapeIds = [...new Set(patterns.map(pattern => pattern.shape_id).filter(Boolean))];
    const shapeRows = await db.queries.getShapesByIds(shapeIds);
    const shapes = {};
    for (const row of shapeRows) {
        shapes[row.shape_id] ||= [];
        shapes[row.shape_id].push({
            latitude: row.shape_pt_lat,
            longitude: row.shape_pt_lon,
            sequence: row.shape_pt_sequence,
            distance_traveled: row.shape_dist_traveled
        });
    }
    return { route_id: routeId, patterns, shapes, trip_pattern_ids };
};

export async function getRoutePatternCatalog(db, cacheService, routeId) {
    if (!cacheService) return buildCatalog(db, routeId);
    return cacheService.getOrSetCache({
        cacheKey: `routePatterns:${routeId}`,
        dbFetchFn: async () => buildCatalog(db, routeId),
        serialize: JSON.stringify,
        deserialize: JSON.parse
    });
}

export function publicRoutePatternCatalog(catalog) {
    const { trip_pattern_ids, ...response } = catalog;
    return response;
}
