import { describe, expect, test, vi } from 'vitest';
import {
    getRoutePatternCatalog,
    publicRoutePatternCatalog
} from '../services/routePatternsService.js';

const stop = (trip_id, stop_id, stop_sequence, overrides = {}) => ({
    trip_id,
    direction_id: 0,
    trip_headsign: 'City',
    shape_id: 'shape-1',
    stop_id,
    stop_code: stop_id,
    stop_name: `Stop ${stop_id}`,
    stop_lat: 53,
    stop_lon: -6,
    stop_sequence,
    shape_dist_traveled: stop_sequence * 10,
    pickup_type: 0,
    drop_off_type: 0,
    ...overrides
});

describe('routePatternsService', () => {
    test('groups equivalent trips and de-duplicates their shape', async () => {
        const db = { queries: {
            getRoutePatternRows: vi.fn().mockResolvedValue([
                stop('trip-1', 'A', 1), stop('trip-1', 'B', 2),
                stop('trip-2', 'A', 1), stop('trip-2', 'B', 2)
            ]),
            getShapesByIds: vi.fn().mockResolvedValue([
                { shape_id: 'shape-1', shape_pt_lat: 53, shape_pt_lon: -6, shape_pt_sequence: 1, shape_dist_traveled: 0 }
            ])
        } };

        const catalog = await getRoutePatternCatalog(db, null, 'route-1');

        expect(catalog.patterns).toHaveLength(1);
        expect(catalog.patterns[0].pattern_id).toMatch(/^ptn_[a-f\d]{12}$/);
        expect(catalog.trip_pattern_ids['trip-1']).toBe(catalog.trip_pattern_ids['trip-2']);
        expect(Object.keys(catalog.shapes)).toEqual(['shape-1']);
        expect(db.queries.getShapesByIds).toHaveBeenCalledWith(['shape-1']);
    });

    test('creates a different pattern when pickup rules differ', async () => {
        const db = { queries: {
            getRoutePatternRows: vi.fn().mockResolvedValue([
                stop('trip-1', 'A', 1),
                stop('trip-2', 'A', 1, { pickup_type: 1 })
            ]),
            getShapesByIds: vi.fn().mockResolvedValue([])
        } };
        const catalog = await getRoutePatternCatalog(db, null, 'route-1');
        expect(catalog.patterns).toHaveLength(2);
    });

    test('does not expose the internal trip-to-pattern lookup', async () => {
        const catalog = {
            route_id: 'route-1', patterns: [], shapes: {}, trip_pattern_ids: { trip: 'pattern' }
        };
        expect(publicRoutePatternCatalog(catalog)).toEqual({ route_id: 'route-1', patterns: [], shapes: {} });
    });

});
