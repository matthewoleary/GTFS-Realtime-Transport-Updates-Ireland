import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import config from '../../../../config.js';

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

const expectUniqueRoutes = (routes, agencyId) => {
  expect(Array.isArray(routes)).toBe(true);

  const routeIds = routes.map(route => route.route_id);
  expect(new Set(routeIds).size).toBe(routeIds.length);

  for (const route of routes) {
    expect(route).toHaveProperty('route_id');
    expect(route).toHaveProperty('agency_id');
    expect(route).toHaveProperty('route_short_name');
    expect(route).toHaveProperty('route_long_name');
    expect(route).toHaveProperty('route_type');
    if (agencyId) {
      expect(route.agency_id).toBe(agencyId);
    }
  }
};

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

  describe('Shapes', () => {
    it('should return shape by id from getShapeById.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/shapes/getShapeById.sql'),
        'utf8'
      );
      // Use a sample shape_id for testing
      const sampleShapeId = '3826_1';
      const [rows] = await connection.query(sql, [sampleShapeId]);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(rows[0]).toHaveProperty('shape_id');
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
      expect(rows.length).toBeGreaterThan(0);

      for (const stop of rows) {
        expect(stop).toHaveProperty('stop_id');
        expect(stop).toHaveProperty('routes');
        expectUniqueRoutes(stop.routes);
      }

      expect(rows.some(stop => stop.routes.length > 0)).toBe(true);
    }, 15000);

    it('should return stops by agency id from getAllStopsByAgencyId.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stops/getAllStopsByAgencyId.sql'),
        'utf8'
      );
      const agencyId = '7778019'; // Dublin Bus sample agency_id for testing
      const [rows] = await connection.query(sql, [agencyId]);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);

      for (const stop of rows) {
        expect(stop).toHaveProperty('stop_id');
        expect(stop).toHaveProperty('routes');
        expectUniqueRoutes(stop.routes, agencyId);
      }
    }, 15000);

    it('should return stop by id from getStopById.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stops/getStopById.sql'),
        'utf8'
      );
      const [sampleStops] = await connection.query(
        'SELECT DISTINCT stop_id FROM stop_times WHERE stop_id IS NOT NULL LIMIT 1'
      );
      expect(sampleStops).toHaveLength(1);
      const sampleStopId = sampleStops[0].stop_id;
      const [rows] = await connection.query(sql, [sampleStopId]);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toHaveLength(1);

      const [stop] = rows;
      expect(stop).toHaveProperty('stop_id');
      expect(stop.stop_id).toBe(sampleStopId);
      expect(stop).toHaveProperty('routes');
      expectUniqueRoutes(stop.routes);
    }, 7000);
  });

  describe('StopTimes', () => {
    it('should return stop times by trip from getStopTimesByTripId.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stopTimes/getStopTimesByTripId.sql'),
        'utf8'
      );
      const sampleTripId = '5512_1219'; // Dublin Bus trip_id for testing
      const [rows] = await connection.query(sql, [sampleTripId]);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0); // Fail if no rows returned
      expect(rows[0]).toHaveProperty('stop_name');
      expect(rows[0]).toHaveProperty('stop_code');
      expect(rows[0]).toHaveProperty('stop_lat');
      expect(rows[0]).toHaveProperty('stop_lon');
      // Assert that all the resulting stop times belong to the specified trip
      const allBelongToTrip = rows.every(row => row.trip_id === sampleTripId);
      expect(allBelongToTrip).toBe(true);
      const allIncludeStopDetails = rows.every(row => 'stop_code' in row && 'stop_name' in row && 'stop_lat' in row && 'stop_lon' in row);
      expect(allIncludeStopDetails).toBe(true);
    });

    it('should return last stop on trip from getLastStopOnTrip.sql', async () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../mysql/stopTimes/getLastStopOnTrip.sql'),
        'utf8'
      );
      const sampleTripId = '5512_1219'; // Dublin Bus trip_id for testing
      const [rows] = await connection.query(sql, [sampleTripId]);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0); // Fail if no rows returned
      expect(rows[0]).toHaveProperty('stop_id');
      // Assert that the stop_id is the expected last stop on the trip
      const expectedLastStopId = '8220DB006094'; // Dublin Bus stop_id for testing
      expect(rows[0].stop_id).toBe(expectedLastStopId);
    });

    it('should return maximum departure timestamp from getMaximumDepartureTimestampQuery', async () => {
      // Import the query generator
      const getMaximumDepartureTimestampQuery = (await import('../mysql/stopTimes/getMaximumDepartureTimestampQuery.js')).default;
      // Use a valid day column and date value
      const dayColumn = 'monday';
      const dateValue = 20260316;
      const sql = getMaximumDepartureTimestampQuery(dayColumn, dateValue);
      // Run the generated SQL
      const [rows] = await connection.query(sql);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0); // Fail if no row is returned
      expect(rows[0]).toHaveProperty('max_departure_timestamp');
      // Assert that max_departure_timestamp is not null and equals the expected value
      const expectedMaxTimestamp = 112440; // This value should be set based on the known data in the test database for the given date and day column
      expect(rows[0].max_departure_timestamp).not.toBeNull();
      expect(typeof rows[0].max_departure_timestamp).toBe('number');
      expect(rows[0].max_departure_timestamp).toBe(expectedMaxTimestamp);
    });
  });

  describe('Trips', () => {
    describe('getTripById', () => {
      it('should return trips from getTripById.sql', async () => {
        const sql = fs.readFileSync(
          path.join(__dirname, '../mysql/trips/getTripById.sql'),
          'utf8'
        );
        // Use a sample trip_id for testing
        const sampleTripId = '5512_1219'; // Dublin Bus trip_id for testing
        const [rows] = await connection.query(sql, [sampleTripId]);
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0); // Fail if no rows returned
        expect(rows[0]).toHaveProperty('trip_id');
        // Assert that all the resulting trips have the expected trip_id
        const allHaveExpectedTripId = rows.every(row => row.trip_id === sampleTripId);
        expect(allHaveExpectedTripId).toBe(true);
      });
    });

    describe('getTripsAtStopIdQuery', () => {
      describe('getTripsAtStopIdQuery', () => {
        it('should return trips for a valid stop and service day', async () => {
          // Example: Use a real stop_id and a valid serviceDay for your test DB
          const getTripsAtStopIdQuery = (await import('../mysql/trips/getTripsAtStopId/getTripsAtStopIdQuery.js')).default;
          const stopId = '8220DB000001';
          const serviceDay = {
            dayColumn: 'monday',
            date: 20260316,
            lowerBoundTimestamp: 36000, // 10:00:00
            upperBoundTimestamp: 39600  // 11:00:00
          };
          const sql = getTripsAtStopIdQuery(serviceDay);
          const [rows] = await connection.query(sql, [stopId]);
          expect(Array.isArray(rows)).toBe(true);
          // Optionally, check that all rows have the correct stop_id and timestamps in range
          if (rows.length > 0) {
            expect(rows[0]).toHaveProperty('trip_id');
            const allCorrectStop = rows.every(row => row.stop_id === stopId);
            expect(allCorrectStop).toBe(true);
            const allInRange = rows.every(row => row.departure_timestamp >= serviceDay.lowerBoundTimestamp && row.departure_timestamp <= serviceDay.upperBoundTimestamp);
            expect(allInRange).toBe(true);
          }
        });
      });

      describe('getTripsAtStopIdNightServicesQuery', () => {
        it('should return night service trips for a valid stop and service days (spanning two days)', async () => {
          // Use a real stop_id and two serviceDay objects for your test DB
          const getTripsAtStopIdNightServicesQuery = (await import('../mysql/trips/getTripsAtStopId/getTripsAtStopIdNightServicesQuery.js')).default;
          const stopId = '8220DB000001';
          // Example: Friday night into Saturday morning
          const wrappedServiceDay = {
            dayColumn: 'friday',
            date: 20260313,
            lowerBoundTimestamp: 79200, // 22:00:00
            upperBoundTimestamp: 86400  // 24:00:00
          };
          const unwrappedServiceDay = {
            dayColumn: 'saturday',
            date: 20260314,
            lowerBoundTimestamp: 0,     // 00:00:00
            upperBoundTimestamp: 18000  // 05:00:00
          };
          const sql = getTripsAtStopIdNightServicesQuery(wrappedServiceDay, unwrappedServiceDay);
          // The query expects stop_id twice (once for each SELECT)
          const [rows] = await connection.query(sql, [stopId, stopId]);
          expect(Array.isArray(rows)).toBe(true);
          if (rows.length > 0) {
            expect(rows[0]).toHaveProperty('trip_id');
            const allCorrectStop = rows.every(row => row.stop_id === stopId);
            expect(allCorrectStop).toBe(true);
            // Check that each row falls within either the wrapped or unwrapped time window
            const allInNightRange = rows.every(row =>
              (row.departure_timestamp >= wrappedServiceDay.lowerBoundTimestamp && row.departure_timestamp <= wrappedServiceDay.upperBoundTimestamp) ||
              (row.departure_timestamp >= unwrappedServiceDay.lowerBoundTimestamp && row.departure_timestamp <= unwrappedServiceDay.upperBoundTimestamp)
            );
            expect(allInNightRange).toBe(true);
          }
        });
      });
    });

    describe('getAllTrips', () => {
      it('should return all trips', async () => {
        const sql = fs.readFileSync(
          path.join(__dirname, '../mysql/trips/getAllTrips.sql'),
          'utf8'
        );
        const [rows] = await connection.query(sql);
        expect(Array.isArray(rows)).toBe(true);
        if (rows.length > 0) {
          expect(rows[0]).toHaveProperty('trip_id');
          expect(rows[0]).toHaveProperty('route_id');
        }
      });
    });

    describe('getTripsByRouteId', () => {
      it('should return trips for a given route_id', async () => {
        const sql = fs.readFileSync(
          path.join(__dirname, '../mysql/trips/getTripsByRouteId.sql'),
          'utf8'
        );
        const sampleRouteId = '5512_123813'; // Use a real route_id from your test DB
        const [rows] = await connection.query(sql, [sampleRouteId]);
        expect(Array.isArray(rows)).toBe(true);
        if (rows.length > 0) {
          expect(rows[0]).toHaveProperty('trip_id');
          const allMatchRoute = rows.every(row => row.route_id === sampleRouteId);
          expect(allMatchRoute).toBe(true);
        }
      });
    });
  });
});
