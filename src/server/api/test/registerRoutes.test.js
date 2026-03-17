import { describe, it, expect, vi } from 'vitest';

const calls = [];
const mockRoute = name => vi.fn(s => calls.push(name));

vi.doMock('../routes/getStops.js', () => ({ default: mockRoute('getStopsRoute') }));
vi.doMock('../routes/getAgencies.js', () => ({ default: mockRoute('getAgenciesRoute') }));
vi.doMock('../routes/getRoutes.js', () => ({ default: mockRoute('getRoutes') }));
vi.doMock('../routes/getStopTimesForTrip.js', () => ({ default: mockRoute('getStopTimesForTripRoute') }));
vi.doMock('../routes/getTrips.js', () => ({ default: mockRoute('getTripsRoute') }));
vi.doMock('../routes/getShapes.js', () => ({ default: mockRoute('getShapesRoute') }));
vi.doMock('../routes/getTripsAtStop.js', () => ({ default: mockRoute('getTripsAtStopRoute') }));

describe('registerRoutes (isolated)', () => {
  it('should call all route functions with server', async () => {
    const { registerRoutes } = await import('../index.js');
    const server = {};
    await registerRoutes(server);
    expect(calls).toEqual([
      'getStopsRoute',
      'getRoutes',
      'getAgenciesRoute',
      'getStopTimesForTripRoute',
      'getTripsRoute',
      'getShapesRoute',
      'getTripsAtStopRoute',
    ]);
  });
});
