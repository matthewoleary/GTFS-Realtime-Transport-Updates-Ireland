import { describe, it, expect, vi, beforeEach } from 'vitest';
import register from '../databaseQueriesProcessor.js';

// Helper to create a mock connection
function createMockConnection() {
  return {
    query: vi.fn().mockResolvedValue([[]])
  };
}

describe('databaseQueriesProcessor', () => {
  let getConnection;
  let sqlQueries;
  let processor;

  beforeEach(async () => {
    // Mock loadSqlQueries to avoid file IO
    sqlQueries = {
      getStopById: 'SELECT * FROM stops WHERE stop_id = ?',
      getRouteById: 'SELECT * FROM routes WHERE route_id = ?',
      getAgencyById: 'SELECT * FROM agencies WHERE agency_id = ?',
      getShapeById: 'SELECT * FROM shapes WHERE shape_id = ?',
      getTransfersFromStopId: 'SELECT * FROM transfers WHERE from_stop_id = ?',
      getTransfersToStopId: 'SELECT * FROM transfers WHERE to_stop_id = ?',
      getTripById: 'SELECT * FROM trips WHERE trip_id = ?',
      getLastStopOnTrip: 'SELECT * FROM stops WHERE trip_index = ?',
      getStopTimesByTripId: 'SELECT * FROM stop_times WHERE trip_id = ?',
      getAllStopsByAgency: 'SELECT * FROM stops WHERE agency_id = ?',
      getAllStops: 'SELECT * FROM stops',
      getAllRoutes: 'SELECT * FROM routes',
      getAllAgencies: 'SELECT * FROM agencies',
    };
    getConnection = vi.fn().mockResolvedValue(createMockConnection());
    // Patch dynamic query functions
    vi.mock('../mysql/trips/getTripsAtStopId/getTripsAtStopIdQuery.js', () => ({ default: vi.fn(() => 'DYNAMIC_QUERY') }));
    vi.mock('../mysql/trips/getTripsAtStopId/getTripsAtStopIdNightServicesQuery.js', () => ({ default: vi.fn(() => 'DYNAMIC_NIGHT_QUERY') }));
    vi.mock('../mysql/stopTimes/getMaximumDepartureTimestampQuery.js', () => ({ default: vi.fn(() => 'MAX_DEPARTURE_QUERY') }));
    // Import after mocks, inject loadSqlQueries
    processor = await register({ getConnection, loadSqlQueries: vi.fn().mockResolvedValue(sqlQueries) });
  });

  it('should call getStopById with correct SQL and param', async () => {
    const stopId = 123;
    await processor.getStopById(stopId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getStopById, [stopId]);
  });

  it('should call getRouteById with correct SQL and param', async () => {
    const routeId = 456;
    await processor.getRouteById(routeId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getRouteById, [routeId]);
  });

  it('should call getAgencyById with correct SQL and param', async () => {
    const agencyId = 789;
    await processor.getAgencyById(agencyId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getAgencyById, [agencyId]);
  });

  it('should call getShapeById with correct SQL and param', async () => {
    const shapeId = 321;
    await processor.getShapeById(shapeId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getShapeById, [shapeId]);
  });

  it('should call getTransfersFromStopId and getTransfersToStopId', async () => {
    const stopId = 111;
    await processor.getTransfersFromStopId(stopId);
    await processor.getTransfersToStopId(stopId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getTransfersFromStopId, [stopId]);
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getTransfersToStopId, [stopId]);
  });

  it('should call getTripById with correct SQL and param', async () => {
    const tripId = 222;
    await processor.getTripById(tripId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getTripById, [tripId]);
  });

  it('should call getLastStops for each trip', async () => {
    const trips = [{ trip_index: 1 }, { trip_index: 2 }];
    await processor.getLastStops(trips);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getLastStopOnTrip, [1]);
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getLastStopOnTrip, [2]);
  });

  it('should call getStopTimesByTripId with correct SQL and param', async () => {
    const tripId = 333;
    await processor.getStopTimesByTripId(tripId);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getStopTimesByTripId, [tripId]);
  });

  it('should call getTripsAtStopId with dynamic query', async () => {
    const stopId = 444;
    const serviceDay = '2026-02-27';
    await processor.getTripsAtStopId({ stopId, serviceDay });
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith('DYNAMIC_QUERY', [stopId]);
  });

  it('should call getTripsAtStopIdWithNightServices with dynamic query', async () => {
    const stopId = 555;
    const wrappedServiceDay = '2026-02-27';
    const unwrappedServiceDay = '2026-02-26';
    await processor.getTripsAtStopIdWithNightServices({ stopId, wrappedServiceDay, unwrappedServiceDay });
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith('DYNAMIC_NIGHT_QUERY', [stopId, stopId]);
  });

  it('should call getMaximumDepartureTimestamp with dynamic query', async () => {
    const dayColumn = 'monday';
    const dateValue = '2026-02-27';
    await processor.getMaximumDepartureTimestamp(dayColumn, dateValue);
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith('MAX_DEPARTURE_QUERY');
  });

  it('should call getAllStops with or without agencyId', async () => {
    const agencyId = 1;
    await processor.getAllStops(agencyId);
    await processor.getAllStops();
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getAllStopsByAgency, [agencyId]);
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getAllStops);
  });

  it('should call getAllRoutes with or without agencyId', async () => {
    const agencyId = 2;
    await processor.getAllRoutes(agencyId);
    await processor.getAllRoutes();
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getAllRoutes, [agencyId]);
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getAllRoutes);
  });

  it('should call getAllAgencies', async () => {
    await processor.getAllAgencies();
    const cnx = await getConnection.mock.results[0].value;
    expect(cnx.query).toHaveBeenCalledWith(sqlQueries.getAllAgencies);
  });
});
