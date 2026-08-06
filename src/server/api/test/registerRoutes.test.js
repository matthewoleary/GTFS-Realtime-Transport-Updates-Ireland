import { describe, it, expect, vi } from 'vitest';

const calls = [];
const mockRoute = name => vi.fn(s => calls.push(name));

vi.doMock('../routes/getStops.js', () => ({ default: mockRoute('getStops') }));
vi.doMock('../routes/getRoutes.js', () => ({ default: mockRoute('getRoutes') }));
vi.doMock('../routes/getAgencies.js', () => ({ default: mockRoute('getAgencies') }));
vi.doMock('../routes/getStopTimes.js', () => ({ default: mockRoute('getStopTimes') }));
vi.doMock('../routes/getTrips.js', () => ({ default: mockRoute('getTrips') }));
vi.doMock('../routes/getShapes.js', () => ({ default: mockRoute('getShapes') }));
vi.doMock('../routes/getTripsAtStop.js', () => ({ default: mockRoute('getTripsAtStop') }));
vi.doMock('../routes/getRouteStops.js', () => ({ default: mockRoute('getRouteStops') }));
vi.doMock('../routes/getActiveTripsOnRoute.js', () => ({ default: mockRoute('getActiveTripsOnRoute') }));

describe('registerRoutes (isolated)', () => {
  it('should call all route functions with server', async () => {
    const { registerRoutes } = await import('../index.js');
    const server = {};
    await registerRoutes(server);
    expect(calls).toEqual([
      'getStops',
      'getRoutes',
      'getTripsAtStop',
      'getAgencies',
      'getStopTimes',
      'getTrips',
      'getShapes',
      'getRouteStops',
      'getActiveTripsOnRoute'
    ]);
  });
});
