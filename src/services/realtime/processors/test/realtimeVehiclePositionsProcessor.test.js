import RealtimeVehiclePositionsProcessor from '../realtimeVehiclePositionsProcessor.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('RealtimeVehiclePositionsProcessor', () => {
  let processor;
  let logger;

  beforeEach(() => {
    logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    processor = new RealtimeVehiclePositionsProcessor(logger);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should set logger', () => {
      expect(processor.logger).toBe(logger);
    });
  });

  describe('processVehicleResponse', () => {
    it('should set vehicle if vehicleEntity exists', async () => {
      const queryResponse = [
        { trip_id: 'trip1' },
        { trip_id: 'trip2' }
      ];
      const feedEntityMap = new Map([
        ['trip1', { vehicle: { id: 'veh1' } }],
        ['trip2', { vehicle: { id: 'veh2' } }]
      ]);
      const result = await processor.processVehicleResponse(queryResponse, feedEntityMap);
      expect(result[0].realtime_vehicle).toEqual({ id: 'veh1' });
      expect(result[1].realtime_vehicle).toEqual({ id: 'veh2' });
    });
    it('should set vehicle to null if vehicleEntity missing or no vehicle', async () => {
      const queryResponse = [
        { trip_id: 'trip1' },
        { trip_id: 'trip2' },
        { trip_id: 'trip3' }
      ];
      const feedEntityMap = new Map([
        ['trip1', { vehicle: { id: 'veh1' } }],
        ['trip2', {}]
      ]);
      const result = await processor.processVehicleResponse(queryResponse, feedEntityMap);
      expect(result[0].realtime_vehicle).toEqual({ id: 'veh1' });
      expect(result[1].realtime_vehicle).toBeNull();
      expect(result[2].realtime_vehicle).toBeNull();
    });

    it('strips the duplicate trip descriptor from the vehicle payload', async () => {
      const result = await processor.processVehicleResponse(
        [{ trip_id: 'trip1' }],
        new Map([['trip1', {
          vehicle: { id: 'veh1', latitude: 52.1, trip: { tripId: 'trip1' } }
        }]])
      );

      expect(result[0].realtime_vehicle).toEqual({ id: 'veh1', latitude: 52.1 });
    });
  });

  describe('register', () => {
    it('should return updateResultsWithRealtimeVehiclePositions that updates payload', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map([
        ['trip1', { vehicle: { id: 'veh1' } }]
      ]));
      const payload = { response: [{ trip_id: 'trip1' }], foo: 'bar' };
      const { updateResultsWithRealtimeVehiclePositions } = await RealtimeVehiclePositionsProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      const updated = await updateResultsWithRealtimeVehiclePositions(payload);
      expect(updated.realtime_vehicle_positions_feed_timestamp).toBe(123);
      expect(updated.response[0].realtime_vehicle).toEqual({ id: 'veh1' });
      expect(getFeedTimestamp).toHaveBeenCalled();
      expect(getFeedTripIdMap).toHaveBeenCalled();
    });
    it('should warn if payload.response is not array', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const payload = { response: null };
      const { updateResultsWithRealtimeVehiclePositions } = await RealtimeVehiclePositionsProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      await updateResultsWithRealtimeVehiclePositions(payload);
      expect(logger.warn).toHaveBeenCalled();
    });
    it('should log error if processVehicleResponse throws', async () => {
      const getFeedTimestamp = vi.fn().mockResolvedValue(123);
      const getFeedTripIdMap = vi.fn().mockResolvedValue(new Map());
      const payload = { response: [] };
      vi.spyOn(RealtimeVehiclePositionsProcessor.prototype, 'processVehicleResponse').mockRejectedValue(new Error('fail'));
      const { updateResultsWithRealtimeVehiclePositions } = await RealtimeVehiclePositionsProcessor.register(getFeedTimestamp, getFeedTripIdMap, logger);
      await updateResultsWithRealtimeVehiclePositions(payload);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
