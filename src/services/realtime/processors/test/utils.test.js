import * as utils from '../utils.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('utils', () => {
  describe('findFeedEntityForTrip', () => {
    it('should return the feed entity for the trip', () => {
      const map = new Map([
        ['trip1', { foo: 1 }],
        ['trip2', { bar: 2 }]
      ]);
      expect(utils.findFeedEntityForTrip({ trip_id: 'trip2' }, map)).toEqual({ bar: 2 });
    });
    it('should return undefined if not found', () => {
      const map = new Map();
      expect(utils.findFeedEntityForTrip({ trip_id: 'tripX' }, map)).toBeUndefined();
    });
  });

  describe('getDueInValue', () => {
    it('should return minutes as string if >= 60s', () => {
      expect(utils.getDueInValue(180, 0)).toBe('3');
      expect(utils.getDueInValue(120, 0)).toBe('2');
    });
    it('should return "Due" if less than 60s', () => {
      expect(utils.getDueInValue(59, 0)).toBe('Due');
      expect(utils.getDueInValue(100, 50)).toBe('Due');
    });
  });

  describe('getTripDescriptorScheduleRelationshipName', () => {
    beforeEach(() => {
      vi.resetModules();
    });
    it('should return the correct string for a value', async () => {
      const mockScheduleRelationship = { SCHEDULED: 0, ADDED: 1, CANCELED: 2 };
      vi.doMock('gtfs-realtime-bindings', () => ({
        default: { transit_realtime: { TripDescriptor: { ScheduleRelationship: mockScheduleRelationship } } },
        transit_realtime: { TripDescriptor: { ScheduleRelationship: mockScheduleRelationship } }
      }));
      const { getTripDescriptorScheduleRelationshipName } = await import('../utils.js');
      expect(getTripDescriptorScheduleRelationshipName(1)).toBe('ADDED');
      expect(getTripDescriptorScheduleRelationshipName(2)).toBe('CANCELED');
      expect(getTripDescriptorScheduleRelationshipName(0)).toBe('SCHEDULED');
      vi.resetModules();
    });
    it('should return undefined for unknown value', async () => {
      const mockScheduleRelationship = { SCHEDULED: 0 };
      vi.doMock('gtfs-realtime-bindings', () => ({
        default: { transit_realtime: { TripDescriptor: { ScheduleRelationship: mockScheduleRelationship } } },
        transit_realtime: { TripDescriptor: { ScheduleRelationship: mockScheduleRelationship } }
      }));
      const { getTripDescriptorScheduleRelationshipName } = await import('../utils.js');
      expect(getTripDescriptorScheduleRelationshipName(99)).toBeUndefined();
      vi.resetModules();
    });
  });

  describe('unwrapTimes', () => {
    it('should unwrap departure and arrival timestamps >= 86400', async () => {
      const orig = {
        departure_timestamp: 86500,
        arrival_timestamp: 87000
      };
      const { unwrapTimes } = await import('../utils.js');
      const result = unwrapTimes({ ...orig });
      expect(result.departure_timestamp).toBe(100);
      expect(result.arrival_timestamp).toBe(600);
      vi.resetModules();
    });
    it('should not unwrap if timestamps < 86400', () => {
      const orig = {
        departure_timestamp: 100,
        arrival_timestamp: 200
      };
      const result = utils.unwrapTimes({ ...orig });
      expect(result.departure_timestamp).toBe(100);
      expect(result.arrival_timestamp).toBe(200);
    });
  });

  describe('getTimestampAsTimeFormatted', () => {
    it('should format timestamp as HH:MM:SS', () => {
      expect(utils.getTimestampAsTimeFormatted(0)).toBe('00:00:00');
      expect(utils.getTimestampAsTimeFormatted(3661)).toBe('01:01:01');
      expect(utils.getTimestampAsTimeFormatted(86399)).toBe('23:59:59');
    });
  });
});
