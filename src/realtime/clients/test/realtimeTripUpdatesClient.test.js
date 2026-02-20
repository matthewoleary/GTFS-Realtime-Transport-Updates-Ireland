import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tripUpdatesClient from '../realtimeTripUpdatesClient.js';

// Test buildFeedTripIdMap

describe('buildFeedTripIdMap', () => {
  it('maps tripId to entity', () => {
    const feed = {
      entity: [
        {
          tripUpdate: {
            trip: { tripId: 'T1' }
          }
        },
        {
          tripUpdate: {
            trip: { tripId: 'T2' }
          }
        },
        {
          tripUpdate: {
            trip: { tripId: 'T3' }
          }
        }
      ]
    };
    const map = tripUpdatesClient.buildFeedTripIdMap(feed);
    expect(map.get('T1')).toBe(feed.entity[0]);
    expect(map.get('T2')).toBe(feed.entity[1]);
    expect(map.get('T3')).toBe(feed.entity[2]);
  });

  it('ignores entities without tripId', () => {
    const feed = {
      entity: [
        { tripUpdate: { trip: {} } },
        { tripUpdate: {} },
        {}
      ]
    };
    const map = tripUpdatesClient.buildFeedTripIdMap(feed);
    expect(map.size).toBe(0);
  });
});

// Test filterFeed

describe('filterFeed', () => {
  it('returns full feed if agencies is empty', () => {
    const feed = { entity: [{ id: 'A1' }, { id: 'A2' }] };
    const result = tripUpdatesClient.filterFeed(feed);
    expect(result.entity.length).toBe(2);
  });

  it('filters feed by agency id', () => {
    const feed = { entity: [{ id: 'A1' }, { id: 'B2' }, { id: 'C3' }] };
    const result = tripUpdatesClient.filterFeed(feed, ['A', 'C']);
    expect(result.entity.length).toBe(2);
    expect(result.entity[0].id).toBe('A1');
    expect(result.entity[1].id).toBe('C3');
  });

  it('returns feed unchanged if entity is missing', () => {
    const feed = {};
    const result = tripUpdatesClient.filterFeed(feed, ['A']);
    expect(result).toBe(feed);
  });
});

// Test createRealtimeTripUpdatesClient (integration)
describe('createRealtimeTripUpdatesClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates and starts client, returns queryProcessor', async () => {
    // Mock dependencies
    vi.mock('../realtimeFeedClient.js', () => {
      const mockFeedClient = vi.fn().mockImplementation(() => ({
        start: vi.fn(),
        registerQueryProcessor: vi.fn().mockResolvedValue({ process: vi.fn() })
      }));
      return { default: mockFeedClient };
    });
    vi.mock('../realtimeLogger.js', () => {
      const mockLogger = {};
      return { default: vi.fn(() => mockLogger) };
    });
    vi.mock('../processors/realtimeTripUpdatesProcessor.js', () => {
      const mockProcessor = { register: vi.fn().mockResolvedValue({ process: vi.fn() }) };
      return { default: mockProcessor };
    });

    const config = { apiKey: 'key', apiTripUpdatesUrl: 'url' };
    const { createRealtimeTripUpdatesClient } = await import('../realtimeTripUpdatesClient.js');
    const result = await createRealtimeTripUpdatesClient({}, config, 10, 20);
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('queryProcessor');
    expect(typeof result.start).toBe('function');
    expect(result.queryProcessor).toHaveProperty('process');
  });
});
