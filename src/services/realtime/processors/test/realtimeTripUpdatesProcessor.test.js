
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RealtimeTripUpdatesProcessor from '../realtimeTripUpdatesProcessor.js';
import * as utils from '../utils.js';

describe('RealtimeTripUpdatesProcessor', () => {
  let processor;
  let logger;

  beforeEach(() => {
    logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    processor = new RealtimeTripUpdatesProcessor(logger);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should set logger', () => {
      expect(processor.logger).toBe(logger);
    });
  });

  describe('applyStopScheduleRelationshipIfPresent', () => {
    it('should set stopScheduleRelationship if present', () => {
      const element = { stop_id: 'stop1' };
      const feedEntity = {
        tripUpdate: {
          stopTimeUpdate: [
            { stopId: 'stop1', scheduleRelationship: 1 },
            { stopId: 'stop2', scheduleRelationship: 2 },
          ],
        },
      };
      vi.spyOn(utils, 'getTripDescriptorScheduleRelationshipName').mockReturnValue('SKIPPED');
      processor.applyStopScheduleRelationshipIfPresent(element, feedEntity);
      expect(element.stopScheduleRelationship).toBe('SKIPPED');
    });
    it('should not set stopScheduleRelationship if not present', () => {
      const element = { stop_id: 'stop1' };
      const feedEntity = {
        tripUpdate: {
          stopTimeUpdate: [
            { stopId: 'stop2', scheduleRelationship: 2 },
          ],
        },
      };
      processor.applyStopScheduleRelationshipIfPresent(element, feedEntity);
      expect(element.stopScheduleRelationship).toBeUndefined();
    });
  });

  describe('applyRealtimeDelay', () => {
    it('should delegate to findNearestStopSequenceDelay when stopTimeUpdates exist', () => {
      const element = { stop_sequence: 2 };
      const feedEntity = {
        tripUpdate: {
          stopTimeUpdate: [
            { stopSequence: 2, departure: { delay: 10 }, arrival: { delay: 5 }, scheduleRelationship: 0 },
          ],
        },
      };
      vi.spyOn(processor, 'findNearestStopSequenceDelay').mockImplementation((el, updates) => {
        el.mocked = true;
        return el;
      });
      const result = processor.applyRealtimeDelay(element, feedEntity);
      expect(result.mocked).toBe(true);
    });
    it('should leave the element unchanged when no stopTimeUpdates exist', () => {
      const element = {};
      const feedEntity = { tripUpdate: {} };
      const result = processor.applyRealtimeDelay(element, feedEntity);
      expect(result).toBe(element);
      expect(result.realtime_departure_timestamp).toBeUndefined();
      expect(result.realtime_arrival_timestamp).toBeUndefined();
    });
  });

  describe('findNearestStopSequenceDelay', () => {
    it('should apply delay from the nearest matching stopTimeUpdate', () => {
      const element = { stop_sequence: 2, departure_timestamp: 100, arrival_timestamp: 200 };
      const stopTimeUpdates = [
        { stopSequence: 1, departure: { delay: 5 }, arrival: { delay: 2 }, scheduleRelationship: 0 },
        { stopSequence: 2, departure: { delay: 10 }, arrival: { delay: 5 }, scheduleRelationship: 0 },
      ];
      vi.spyOn(utils, 'getTimestampAsTimeFormatted').mockImplementation(ts => `t${ts}`);
      const result = processor.findNearestStopSequenceDelay(element, stopTimeUpdates);
      expect(result.realtime_departure_timestamp).toBe(110);
      expect(result.realtime_arrival_timestamp).toBe(205);
      expect(result.realtime_departure_time).toBe('t110');
      expect(result.realtime_arrival_time).toBe('t205');
    });
    it('should not apply delay if no matching stopTimeUpdate is found', () => {
      const element = { stop_sequence: 5, departure_timestamp: 100, arrival_timestamp: 200 };
      const stopTimeUpdates = [
        { stopSequence: 1, scheduleRelationship: 1 },
        { stopSequence: 2, scheduleRelationship: 1 },
      ];
      const result = processor.findNearestStopSequenceDelay(element, stopTimeUpdates);
      expect(result.realtime_departure_timestamp).toBeUndefined();
      expect(result.realtime_arrival_timestamp).toBeUndefined();
    });
  });

  describe('checkArrival', () => {
    it('should mark as arrived if departureTimestamp < now', () => {
      const element = { departure_timestamp: 100 };
      const now = 200;
      const result = processor.checkArrival(element, now);
      expect(result).toBe(true);
    });
    it('should not mark as arrived if departureTimestamp >= now', () => {
      const element = { departure_timestamp: 300 };
      const now = 200;
      const result = processor.checkArrival(element, now);
      expect(result).toBe(false);
    });
    it('should mark as arrived if arrivalTimestamp < now and no departureTimestamp', () => {
      const element = { arrival_timestamp: 100 };
      const now = 200;
      const result = processor.checkArrival(element, now);
      expect(result).toBe(true);
    });
    it('should not mark as arrived if arrivalTimestamp >= now and no departureTimestamp', () => {
      const element = { arrival_timestamp: 300 };
      const now = 200;
      const result = processor.checkArrival(element, now);
      expect(result).toBe(false);
    });
    it('should log error if no timestamps', () => {
      const element = {};
      const now = 200;
      processor.checkArrival(element, now);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('processTripsAtStopResponse', () => {
    it('should process response and filter arrived', async () => {
      const stopResponse = [
        { stop_id: 'stop1', stop_sequence: 1, departure_timestamp: 100, arrival_timestamp: 100 },
        { stop_id: 'stop2', stop_sequence: 2, departure_timestamp: 300, arrival_timestamp: 300 },
      ];
      const feedEntityMap = new Map();
      vi.spyOn(processor, 'applyStopScheduleRelationshipIfPresent').mockImplementation(e => e);
      vi.spyOn(processor, 'applyRealtimeDelay').mockImplementation(e => { e.is_realtime = true; return e; });
      vi.spyOn(processor, 'checkArrival').mockImplementation(e => e.departure_timestamp < 200);
      vi.spyOn(utils, 'unwrapTimes').mockImplementation(e => e);
      vi.spyOn(processor, 'sortByArrival').mockImplementation(arr => arr);
      const result = await processor.processTripsAtStopResponse(stopResponse, feedEntityMap, 200);
      expect(result.length).toBe(1);
      expect(result[0].stop_id).toBe('stop2');
    });
  });

  describe('processStopTimesResponse', () => {
    it('matches repeated stops by stopSequence before falling back to stopId', async () => {
      const stopTimesResponse = [
        { trip_id: 'trip-1', stop_id: 'stop-1', stop_sequence: 1 },
        { trip_id: 'trip-1', stop_id: 'stop-1', stop_sequence: 5 }
      ];
      const feedEntityMap = new Map([
        ['trip-1', {
          tripUpdate: {
            stopTimeUpdate: [
              { stopId: 'stop-1', stopSequence: 1, departure: { delay: 60 } },
              { stopId: 'stop-1', stopSequence: 5, departure: { delay: 120 } }
            ]
          }
        }]
      ]);

      const result = await processor.processStopTimesResponse(stopTimesResponse, feedEntityMap);

      expect(result[0].stopTimeUpdate.stopSequence).toBe(1);
      expect(result[1].stopTimeUpdate.stopSequence).toBe(5);
    });
  });

  describe('register', () => {
    it('should return updateTripWithRealtimeUpdates that updates query', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: { trip_id: 'trip-1' }, timestamp: 1000 };
      vi.spyOn(RealtimeTripUpdatesProcessor.prototype, 'processTripResponse').mockResolvedValue({ trip_id: 'trip-1', is_realtime: true });
      const { updateTripWithRealtimeUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      const updated = await updateTripWithRealtimeUpdates(query);
      expect(updated.realtime_trip_updates_feed_timestamp).toBe(123);
      expect(updated.response).toEqual({ trip_id: 'trip-1', is_realtime: true });
      expect(getFeedTimestamp).toHaveBeenCalled();
      expect(getFeedTripIdMap).toHaveBeenCalled();
    });

    it('should log error if processTripResponse throws', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: { trip_id: 'trip-1' }, timestamp: 1000 };
      vi.spyOn(RealtimeTripUpdatesProcessor.prototype, 'processTripResponse').mockRejectedValue(new Error('fail'));
      const { updateTripWithRealtimeUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      await updateTripWithRealtimeUpdates(query);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return updateStopWithRealtimeUpdates that updates query', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: [] };
      vi.spyOn(RealtimeTripUpdatesProcessor.prototype, 'processTripsAtStopResponse').mockResolvedValue([]);
      const { updateStopWithRealtimeUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      const updated = await updateStopWithRealtimeUpdates(query);
      expect(updated.realtime_trip_updates_feed_timestamp).toBe(123);
      expect(getFeedTimestamp).toHaveBeenCalled();
      expect(getFeedTripIdMap).toHaveBeenCalled();
    });

    it('should log error if processTripsAtStopResponse throws', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: [] };
      vi.spyOn(RealtimeTripUpdatesProcessor.prototype, 'processTripsAtStopResponse').mockRejectedValue(new Error('fail'));
      const { updateStopWithRealtimeUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      await updateStopWithRealtimeUpdates(query);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('sortByArrival', () => {
    it('should sort by arrival_timestamp ascending', () => {
      const arr = [
        { arrival_timestamp: 300 },
        { arrival_timestamp: 100 },
        { arrival_timestamp: 200 }
      ];
      const sorted = processor.sortByArrival(arr);
      expect(sorted.map(e => e.arrival_timestamp)).toEqual([100, 200, 300]);
    });

    it('should prefer unwrapped arrival timestamps when present', () => {
      const arr = [
        { id: 'previous-service', arrival_timestamp: 90000, unwrapped_arrival_timestamp: 3600 },
        { id: 'next-day', arrival_timestamp: 5400 }
      ];
      const sorted = processor.sortByArrival(arr);
      expect(sorted.map(e => e.id)).toEqual(['previous-service', 'next-day']);
    });
  });
});
