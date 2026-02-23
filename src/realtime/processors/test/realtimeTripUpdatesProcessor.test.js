
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
    it('should call findNearestStopSequenceDelay and set is_realtime', () => {
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
      expect(result.is_realtime).toBe(true);
      expect(result.mocked).toBe(true);
    });
    it('should not set is_realtime if no stopTimeUpdate', () => {
      const element = {};
      const feedEntity = { tripUpdate: {} };
      const result = processor.applyRealtimeDelay(element, feedEntity);
      expect(result.is_realtime).toBeUndefined();
    });
  });

  describe('findNearestStopSequenceDelay', () => {
    it('should apply delay from nearest stopTimeUpdate', () => {
      const element = { stop_sequence: 2, departure_timestamp: 100, arrival_timestamp: 200 };
      const stopTimeUpdates = [
        { stopSequence: 1, departure: { delay: 5 }, arrival: { delay: 2 }, scheduleRelationship: 0 },
        { stopSequence: 2, departure: { delay: 10 }, arrival: { delay: 5 }, scheduleRelationship: 0 },
      ];
      vi.spyOn(utils, 'getTimestampAsTimeFormatted').mockImplementation(ts => `t${ts}`);
      const result = processor.findNearestStopSequenceDelay(element, stopTimeUpdates);
      expect(result.departure_timestamp).toBe(110);
      expect(result.arrival_timestamp).toBe(205);
    });
    it('should not apply delay if no matching stopTimeUpdate', () => {
      const element = { stop_sequence: 5, departure_timestamp: 100, arrival_timestamp: 200 };
      const stopTimeUpdates = [
        { stopSequence: 1, scheduleRelationship: 1 },
        { stopSequence: 2, scheduleRelationship: 1 },
      ];
      const result = processor.findNearestStopSequenceDelay(element, stopTimeUpdates);
      expect(result.departure_timestamp).toBe(100);
      expect(result.arrival_timestamp).toBe(200);
    });
  });

  describe('markArrivalAndDueIn', () => {
    it('should mark as arrived if departureTimestamp < now', () => {
      const element = { departure_timestamp: 100 };
      const now = 200;
      const result = processor.markArrivalAndDueIn(element, now);
      expect(result.arrived).toBe(true);
    });
    it('should set due_in if departureTimestamp >= now', () => {
      const element = { departure_timestamp: 300 };
      const now = 200;
      vi.spyOn(utils, 'getDueInValue').mockReturnValue(42);
      const result = processor.markArrivalAndDueIn(element, now);
      expect(result.due_in).toBe(42);
    });
    it('should mark as arrived if arrivalTimestamp < now and no departureTimestamp', () => {
      const element = { arrival_timestamp: 100 };
      const now = 200;
      const result = processor.markArrivalAndDueIn(element, now);
      expect(result.arrived).toBe(true);
    });
    it('should set due_in if arrivalTimestamp >= now and no departureTimestamp', () => {
      const element = { arrival_timestamp: 300 };
      const now = 200;
      vi.spyOn(utils, 'getDueInValue').mockReturnValue(99);
      const result = processor.markArrivalAndDueIn(element, now);
      expect(result.due_in).toBe(99);
    });
    it('should log error if no timestamps', () => {
      const element = {};
      const now = 200;
      processor.markArrivalAndDueIn(element, now);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('processStopResponse', () => {
    it('should process stopResponse and filter arrived', async () => {
      const stopResponse = [
        { stop_id: 'stop1', stop_sequence: 1, departure_timestamp: 100, arrival_timestamp: 100 },
        { stop_id: 'stop2', stop_sequence: 2, departure_timestamp: 300, arrival_timestamp: 300 },
      ];
      const feedEntityMap = new Map();
      vi.spyOn(processor, 'applyStopScheduleRelationshipIfPresent').mockImplementation(e => e);
      vi.spyOn(processor, 'applyRealtimeDelay').mockImplementation(e => { e.is_realtime = true; return e; });
      vi.spyOn(processor, 'markArrivalAndDueIn').mockImplementation(e => { if (e.departure_timestamp < 200) { e.arrived = true; } return e; });
      vi.spyOn(utils, 'unwrapTimes').mockImplementation(e => e);
      vi.spyOn(utils, 'sortByArrival').mockImplementation(arr => arr);
      const result = await processor.processStopResponse(stopResponse, feedEntityMap, 200);
      expect(result.length).toBe(1);
      expect(result[0].stop_id).toBe('stop2');
    });
  });

  describe('register', () => {
    it('should return updateResultsWithRealtimeTripUpdates that updates query', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: [], since_midnight_timestamp: 100 };
      vi.spyOn(RealtimeTripUpdatesProcessor.prototype, 'processStopResponse').mockResolvedValue([]);
      const { updateResultsWithRealtimeTripUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      const updated = await updateResultsWithRealtimeTripUpdates(query);
      expect(updated.realtime_trip_updates_feed_timestamp).toBe(123);
      expect(getFeedTimestamp).toHaveBeenCalled();
      expect(getFeedTripIdMap).toHaveBeenCalled();
    });
    it('should warn if query.response is not array', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: null, since_midnight_timestamp: 100 };
      const { updateResultsWithRealtimeTripUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      await updateResultsWithRealtimeTripUpdates(query);
      expect(logger.warn).toHaveBeenCalled();
    });
    it('should log error if processStopResponse throws', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const query = { response: [], since_midnight_timestamp: 100 };
      vi.spyOn(RealtimeTripUpdatesProcessor.prototype, 'processStopResponse').mockRejectedValue(new Error('fail'));
      const { updateResultsWithRealtimeTripUpdates } = await RealtimeTripUpdatesProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      await updateResultsWithRealtimeTripUpdates(query);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
