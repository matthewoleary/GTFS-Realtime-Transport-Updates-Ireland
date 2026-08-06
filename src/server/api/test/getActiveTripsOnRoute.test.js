import { beforeEach, describe, expect, test, vi } from 'vitest';
import getActiveTripsOnRoute from '../routes/getActiveTripsOnRoute.js';

const getDatabaseClient = vi.fn();
const getRealtimeTripUpdatesClient = vi.fn();
const getRealtimeVehiclePositionsClient = vi.fn();
const getRoutePatternCatalog = vi.fn();

vi.mock('../index.js', () => ({
    getCacheService: vi.fn(() => null),
    getDatabaseClient: (...arguments_) => getDatabaseClient(...arguments_),
    getRealtimeTripUpdatesClient: (...arguments_) => getRealtimeTripUpdatesClient(...arguments_),
    getRealtimeVehiclePositionsClient: (...arguments_) => getRealtimeVehiclePositionsClient(...arguments_)
}));
vi.mock('../services/routePatternsService.js', () => ({
    getRoutePatternCatalog: (...arguments_) => getRoutePatternCatalog(...arguments_)
}));
vi.mock('../../serverLogger.js', () => ({
    default: function ServerLogger() {
        this.error = vi.fn();
    }
}));

describe('getActiveTripsOnRoute', () => {
    let route;
    let tripUpdates;
    let vehiclePositions;

    beforeEach(() => {
        const server = { route: vi.fn(definition => { route = definition; }) };
        tripUpdates = {
            getFeedTripIdMap: vi.fn().mockResolvedValue(new Map([['update-only', {}], ['both', {}]])),
            queryProcessor: { updateTripWithRealtimeUpdates: vi.fn(async payload => payload) }
        };
        vehiclePositions = {
            getFeedTripIdMap: vi.fn().mockResolvedValue(new Map([['vehicle-only', {}], ['both', {}]])),
            queryProcessor: { updateResultsWithRealtimeVehiclePositions: vi.fn(async payload => payload) }
        };
        getDatabaseClient.mockReturnValue({ queries: {
            getRouteById: vi.fn().mockResolvedValue([{ route_id: 'route-1' }]),
            getTripsByRouteId: vi.fn().mockResolvedValue([
                { trip_id: 'update-only' }, { trip_id: 'vehicle-only' }, { trip_id: 'both' }
            ])
        } });
        getRealtimeTripUpdatesClient.mockReturnValue(tripUpdates);
        getRealtimeVehiclePositionsClient.mockReturnValue(vehiclePositions);
        getRoutePatternCatalog.mockResolvedValue({
            trip_pattern_ids: { 'update-only': 'one', 'vehicle-only': 'two', both: 'three' }
        });
        getActiveTripsOnRoute(server);
    });

    const invoke = async vehiclePositionsOnly => {
        const response = { header: vi.fn().mockReturnThis() };
        const handler = { response: vi.fn(() => response) };
        await route.handler({
            params: { routeId: 'route-1' },
            query: { vehiclePositionsOnly }
        }, handler);
        return handler.response.mock.calls[0][0].response;
    };

    test('returns the union of both realtime feeds by default', async () => {
        expect((await invoke(false)).map(trip => trip.trip_id)).toEqual([
            'update-only', 'vehicle-only', 'both'
        ]);
    });

    test('can return only trips with vehicle positions', async () => {
        expect((await invoke(true)).map(trip => trip.trip_id)).toEqual(['vehicle-only', 'both']);
        expect(tripUpdates.queryProcessor.updateTripWithRealtimeUpdates).not.toHaveBeenCalled();
        expect(vehiclePositions.queryProcessor.updateResultsWithRealtimeVehiclePositions).toHaveBeenCalledOnce();
    });
});
