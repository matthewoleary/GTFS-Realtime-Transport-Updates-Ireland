import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../index.js';

describe('API index', () => {
  describe('getDatabaseClient', () => {
    it('should return the database client from request', () => {
      const client = {};
      const request = { server: { plugins: { database: { client } } } };
      expect(api.getDatabaseClient(request)).toBe(client);
    });
  });

  describe('getRealtimeTripUpdatesClient', () => {
    it('should return the realtimeTripUpdatesClient from request', () => {
      const client = {};
      const request = { server: { plugins: { realtimeTripUpdates: { realtimeTripUpdatesClient: client } } } };
      expect(api.getRealtimeTripUpdatesClient(request)).toBe(client);
    });
    it('should return null if not available', () => {
      const request = { server: { plugins: { realtimeTripUpdates: {} } } };
      expect(api.getRealtimeTripUpdatesClient(request)).toBeNull();
    });
  });

  describe('getRealtimeVehiclePositionsClient', () => {
    it('should return the realtimeVehiclePositionsClient from request', () => {
      const client = {};
      const request = { server: { plugins: { realtimeVehiclePositions: { realtimeVehiclePositionsClient: client } } } };
      expect(api.getRealtimeVehiclePositionsClient(request)).toBe(client);
    });
    it('should return null if not available', () => {
      const request = { server: { plugins: { realtimeVehiclePositions: {} } } };
      expect(api.getRealtimeVehiclePositionsClient(request)).toBeNull();
    });
  });
});
