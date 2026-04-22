import { describe, it, expect, vi } from 'vitest';

vi.mock('../realtimeFeedClient.js', () => {
    const MockFeedClient = vi.fn().mockImplementation(function () {
        this.start = vi.fn();
        this.registerQueryProcessor = vi.fn().mockResolvedValue({ process: vi.fn() });
    });
    return { default: MockFeedClient };
});
vi.mock('../realtimeLogger.js', () => {
    const mockLogger = {};
    return { default: vi.fn(() => mockLogger) };
});
vi.mock('../processors/realtimeVehiclePositionsProcessor.js', () => {
    const mockProcessor = { register: vi.fn().mockResolvedValue({ process: vi.fn() }) };
    return { default: mockProcessor };
});

import * as vehiclePositionsClient from '../realtimeVehiclePositionsClient.js';

// Test buildFeedVehiclePositionsTripIdMap

describe('buildFeedVehiclePositionsTripIdMap', () => {
    it('maps tripId to entity', () => {
        const feed = {
            entity: [
                {
                    vehicle: {
                        trip: { tripId: 'V1' }
                    }
                },
                {
                    vehicle: {
                        trip: { tripId: 'V2' }
                    }
                },
                {
                    vehicle: {
                        trip: { tripId: 'V3' }
                    }
                }
            ]
        };
        const map = vehiclePositionsClient.buildFeedVehiclePositionsTripIdMap(feed);
        expect(map.get('V1')).toBe(feed.entity[0]);
        expect(map.get('V2')).toBe(feed.entity[1]);
        expect(map.get('V3')).toBe(feed.entity[2]);
    });

    it('ignores entities without tripId', () => {
        const feed = {
            entity: [
                { vehicle: { trip: {} } },
                { vehicle: {} },
                {}
            ]
        };
        const map = vehiclePositionsClient.buildFeedVehiclePositionsTripIdMap(feed);
        expect(map.size).toBe(0);
    });

    it('throws error when feed.entity is null', () => {
        const feed = {
            entity: null
        };
        expect(() => vehiclePositionsClient.buildFeedVehiclePositionsTripIdMap(feed)).toThrow();
    });

    it('throws error when feed.entity is undefined', () => {
        const feed = {
            entity: undefined
        };
        expect(() => vehiclePositionsClient.buildFeedVehiclePositionsTripIdMap(feed)).toThrow();
    });
});

// Test createRealtimeVehiclePositionsClient (integration)
describe('createRealtimeVehiclePositionsClient', () => {
    it('creates and starts client, returns queryProcessor', async () => {
        const config = { apiKey: 'key', apiVehiclePositionsUrl: 'url' };
        const { createRealtimeVehiclePositionsClient } = await import('../realtimeVehiclePositionsClient.js');
        const result = await createRealtimeVehiclePositionsClient({}, config, 10, 20);
        expect(result).toHaveProperty('start');
        expect(result).toHaveProperty('queryProcessor');
        expect(typeof result.start).toBe('function');
        expect(result.queryProcessor).toHaveProperty('process');
        // Assert that client.start() was called during initialization
        const { default: ImportedMockFeedClient } = await import('../realtimeFeedClient.js');
        const mockInstance = ImportedMockFeedClient.mock.instances[0];
        expect(mockInstance.start).toHaveBeenCalled();
    });
});
