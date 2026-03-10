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
const mockApiURLFallback = 'https://fake-url.com/fallback';

function createClient(overrides = {}) {
    return new RealtimeFeedClient(
        overrides.logger || mockLogger,
        mockApiKey,
        mockApiURL,
        mockApiURLFallback,
        overrides.processor || mockProcessor,
        overrides.buildTripIdMapFn || mockBuildTripIdMapFn,
        overrides.dayServiceInterval || 10,
        overrides.nightServiceInterval || 10,
        overrides.recoveryInterval || 10
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

    it('should retry primary URL before switching to fallback', async () => {
        const client = createClient();
        // Fail primary URL 3 times, then fallback succeeds
        axios.mockRejectedValueOnce(new Error('Primary fail 1'));
        axios.mockRejectedValueOnce(new Error('Primary fail 2'));
        axios.mockRejectedValueOnce(new Error('Primary fail 3'));
        axios.mockResolvedValueOnce({ status: 200, data: new Uint8Array([1, 2, 3]) });
        gtfsRealtimeBindings.transit_realtime.FeedMessage.decode.mockReturnValue({ entity: [{}] });
        await client.sendGetRequest();
        // Check logger call sequence
        const calls = mockLogger.errorFetchingFeed.mock.calls;
        expect(calls.length).toBe(3);
        expect(calls[0][1]).toContain('Retrying (1/3) for https://fake-url.com/feed');
        expect(calls[1][1]).toContain('Retrying (2/3) for https://fake-url.com/feed');
        expect(calls[2][1]).toContain('Switching to backup URL for GTFS-realtime feed.');
        expect(client.activeURL).toBe(mockApiURLFallback);
        expect(mockLogger.success).toHaveBeenCalled();
    });

    it('should retry fallback URL if primary and fallback both fail', async () => {
        const client = createClient();
        // Fail primary 3 times, fallback 3 times
        axios.mockRejectedValueOnce(new Error('Primary fail 1'));
        axios.mockRejectedValueOnce(new Error('Primary fail 2'));
        axios.mockRejectedValueOnce(new Error('Primary fail 3'));
        axios.mockRejectedValueOnce(new Error('Fallback fail 1'));
        axios.mockRejectedValueOnce(new Error('Fallback fail 2'));
        axios.mockRejectedValueOnce(new Error('Fallback fail 3'));
        await client.sendGetRequest();
        // Check logger call sequence
        const calls = mockLogger.errorFetchingFeed.mock.calls;
        expect(calls.length).toBe(6);
        expect(calls[0][1]).toContain('Retrying (1/3) for https://fake-url.com/feed');
        expect(calls[1][1]).toContain('Retrying (2/3) for https://fake-url.com/feed');
        expect(calls[2][1]).toContain('Switching to backup URL for GTFS-realtime feed.');
        expect(calls[3][1]).toContain('Retrying (1/3) for https://fake-url.com/fallback');
        expect(calls[4][1]).toContain('Retrying (2/3) for https://fake-url.com/fallback');
        expect(calls[5][1]).toContain('All retries failed for https://fake-url.com/fallback');
    });

    it('should switch back to primary URL and clear timer in startRecoveryCheck()', async () => {
        vi.useFakeTimers();
        const client = createClient();
        client.activeURL = mockApiURLFallback;
        client.recoveryInterval = 5;
        client.apiURL = mockApiURL;
        client.logger = mockLogger;
        client.startRecoveryCheck();
        // Simulate HEAD request success
        axios.mockResolvedValueOnce({ status: 200 });
        vi.advanceTimersByTime(5);
        await Promise.resolve();
        expect(client.activeURL).toBe(mockApiURL);
        expect(mockLogger.success).toHaveBeenCalledWith('Primary URL recovered, switching back.');
        expect(client.recoveryTimer).toBeNull();
        vi.useRealTimers();
    });
});