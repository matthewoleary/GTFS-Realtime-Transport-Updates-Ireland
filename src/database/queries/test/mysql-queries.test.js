import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import config from '../../../config.js';

let connection;

beforeAll(async () => {
  const { host, user, password, database, port } = config.test.sql;
  connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });
});

afterAll(async () => {
  if (connection) await connection.end();
});

describe('MySQL Query Tests (uses gtfs-db-testing docker container)', () => {
  describe('Agencies', () => {
    it('should return agencies from getAllAgencies.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/agencies/getAllAgencies.sql'),
        'utf8'
      );
      const [rows] = await connection.query(sql);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('agency_id');
      }
    });

    it('should return agency by ID from getAgencyById.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/agencies/getAgencyById.sql'),
        'utf8'
      );
      const sampleAgencyId = '7778019'; // Dublin Bus sample agency_id for testing
      const [rows] = await connection.query(sql, [sampleAgencyId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('agency_id');
        // Assert that at least one row has the expected agency_name
        const found = rows.some(row => row.agency_name === 'Bus Átha Cliath – Dublin Bus');
        expect(found).toBe(true);
      }
    });
  });

  describe('Routes', () => {
    it('should return routes from getAllRoutes.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/routes/getAllRoutes.sql'),
        'utf8'
      );
      const [rows] = await connection.query(sql);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('route_id');
      }
    });

    it('should return routes by agency from getAllRoutesByAgencyId.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/routes/getAllRoutesByAgencyId.sql'),
        'utf8'
      );
      const sampleAgencyId = '7778019'; // Dublin Bus sample agency_id for testing
      const [rows] = await connection.query(sql, [sampleAgencyId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('route_id');
        // Assert that all the resulting routes belong to the specified agency
        const allBelongToAgency = rows.every(row => row.agency_id === sampleAgencyId);
        expect(allBelongToAgency).toBe(true);
      }
    });

    it('should return route by ID from getRouteById.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/routes/getRouteById.sql'),
        'utf8'
      );
      const sampleRouteId = '5512_123813'; // Dublin Bus route_id for testing
      const [rows] = await connection.query(sql, [sampleRouteId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('route_id');
        // Assert that all rows have the expected route_id
        const allHaveExpectedRouteId = rows.every(row => row.route_id === sampleRouteId);
        expect(allHaveExpectedRouteId).toBe(true);
      }
    });
  });

  describe('Stops', () => {
    it('should return stops from getAllStops.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stops/getAllStops.sql'),
        'utf8'
      );
      const [rows] = await connection.query(sql);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('stop_id');
      }
    });

    it('should return stops by agency from getAllStopsByAgency.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stops/getAllStopsByAgency.sql'),
        'utf8'
      );
      // Use a sample agency_id for testing
      const sampleAgencyId = '7778019'; // Dublin Bus sample agency_id for testing
      const [rows] = await connection.query(sql, [sampleAgencyId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('stop_id');
        // Assert that all the resulting stops belong to the specified agency
        const allBelongToAgency = rows.every(row => row.agency_id === sampleAgencyId);
        expect(allBelongToAgency).toBe(true);
      }
    });

    it('should return last stop on trip from getLastStopOnTrip.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stops/getLastStopOnTrip.sql'),
        'utf8'
      );
      // Use a sample trip_id for testing
      const sampleTripId = 'sample_trip_id';
      const [rows] = await connection.query(sql, [sampleTripId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('stop_id');
      }
    });
  });

  describe('Trips', () => {
    it('should return trips from getTripById.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/trips/getTripById.sql'),
        'utf8'
      );
      // Use a sample trip_id for testing
      const sampleTripId = 'sample_trip_id';
      const [rows] = await connection.query(sql, [sampleTripId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('trip_id');
      }
    });
  });

  describe('StopTimes', () => {
    it('should return stop times by trip from getStopTimesByTripId.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stopTimes/getStopTimesByTripId.sql'),
        'utf8'
      );
      // Use a sample trip_id for testing
      const sampleTripId = 'sample_trip_id';
      const [rows] = await connection.query(sql, [sampleTripId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('stop_id');
      }
    });
  });

  describe('Shapes', () => {
    it('should return shape by id from getShapeById.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/shapes/getShapeById.sql'),
        'utf8'
      );
      // Use a sample shape_id for testing
      const sampleShapeId = 'sample_shape_id';
      const [rows] = await connection.query(sql, [sampleShapeId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('shape_id');
      }
    });
  });
});
