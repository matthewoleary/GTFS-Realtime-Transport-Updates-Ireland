import RealtimeFeedClient from '../realtimeFeedClient.js';
import gtfsRealtimeBindings from 'gtfs-realtime-bindings';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('axios');
vi.mock('gtfs-realtime-bindings', () => {
    const transitRealtime = {
        FeedMessage: {
            decode: vi.fn()
        }
    };
    return {
        default: { transit_realtime: transitRealtime },
        transit_realtime: transitRealtime
    };
});

const mockLogger = {
    updateFeed: vi.fn(),
    success: vi.fn(),
    errorFetchingFeed: vi.fn()
};

const mockProcessor = {
    register: vi.fn().mockResolvedValue({ process: vi.fn() })
};

const mockBuildTripIdMapFn = vi.fn().mockReturnValue({});

const mockApiKey = 'test-api-key';
const mockApiURL = 'https://fake-url.com/feed';

function createClient(overrides = {}) {
    return new RealtimeFeedClient(
        overrides.logger || mockLogger,
        mockApiKey,
        mockApiURL,
        overrides.processor || mockProcessor,
        overrides.buildTripIdMapFn || mockBuildTripIdMapFn,
        overrides.dayServiceInterval || 10,
        overrides.nightServiceInterval || 10
    );
}

describe('RealtimeFeedClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should start polling only once', async () => {
        const client = createClient();
        client.sendGetRequest = vi.fn();
        await client.start();
        await client.start();
        expect(client.started).toBe(true);
        expect(client.sendGetRequest).toHaveBeenCalledTimes(1);
    });

    it('should decode feed and update state on successful request (using GTFSR-V2-Output.json)', async () => {
        const client = createClient();
        const fixturePath = path.resolve(__dirname, '../../test/GTFSR-V2-Output.json');
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        gtfsRealtimeBindings.transit_realtime.FeedMessage.decode.mockReturnValue(fixtureData);
        axios.mockResolvedValue({ status: 200, data: new Uint8Array([1, 2, 3]) });
        await client.sendGetRequest();
        expect(client.feed).toEqual(fixtureData);
        expect(mockLogger.success).toHaveBeenCalled();
        expect(mockBuildTripIdMapFn).toHaveBeenCalledWith(fixtureData);
        // Additional assertion: check entities
        expect(Array.isArray(client.feed.entity)).toBe(true);
        expect(client.feed.entity.length).toBeGreaterThan(0);
    });

    it('should handle errors and call logger.errorFetchingFeed', async () => {
        const client = createClient();
        axios.mockRejectedValue(new Error('Network error'));
        await client.sendGetRequest();
        expect(mockLogger.errorFetchingFeed).toHaveBeenCalled();
    });

    it('should register query processor with bound methods', async () => {
        const client = createClient();
        const result = await client.registerQueryProcessor(mockLogger);
        expect(mockProcessor.register).toHaveBeenCalled();
        expect(result).toHaveProperty('process');
    });

    it('should return feed timestamp and tripIdMap', async () => {
        const client = createClient();
        client.feed = { header: { timestamp: { low: 54321 } } };
        client.feedTripIdMap = { trip1: {} };
        expect(client.getFeedTimestamp()).toBe(54321);
        expect(client.getFeedTripIdMap()).toEqual({ trip1: {} });
    });

    it('should return undefined when feed is null', () => {
        const client = createClient();
        client.feed = null;
        expect(client.getFeedTimestamp()).toBeUndefined();
    });

    it('should not update feed on non-200 response', async () => {
        const client = createClient();
        client.feed = { header: { timestamp: { low: 123 } } };
        axios.mockResolvedValue({ status: 404, data: new Uint8Array([1, 2, 3]) });
        await client.sendGetRequest();
        // Feed should remain unchanged
        expect(client.feed).toEqual({ header: { timestamp: { low: 123 } } });
        expect(mockLogger.success).not.toHaveBeenCalled();
        expect(mockBuildTripIdMapFn).not.toHaveBeenCalled();
    });
});