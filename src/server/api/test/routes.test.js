import { describe, test, expect, vi } from 'vitest';
import { registerRoutes } from '../index.js';

vi.mock('../routes/getStops.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getRoutes.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getAgencies.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getStopTimes.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getTrips.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getShapes.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getTripsAtStop.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getRouteStops.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getActiveTripsOnRoute.js', () => ({ default: vi.fn() }));

describe('registerRoutes', () => {
  test('calls all route registration functions', async () => {
    const server = {};
    await registerRoutes(server);
    const getStops = (await import('../routes/getStops.js')).default;
    const getRoutes = (await import('../routes/getRoutes.js')).default;
    const getAgencies = (await import('../routes/getAgencies.js')).default;
    const getStopTimes = (await import('../routes/getStopTimes.js')).default;
    const getTrips = (await import('../routes/getTrips.js')).default;
    const getShapes = (await import('../routes/getShapes.js')).default;
    const getTripsAtStop = (await import('../routes/getTripsAtStop.js')).default;
    const getRouteStops = (await import('../routes/getRouteStops.js')).default;
    const getActiveTripsOnRoute = (await import('../routes/getActiveTripsOnRoute.js')).default;
    expect(getStops).toHaveBeenCalledWith(server);
    expect(getRoutes).toHaveBeenCalledWith(server);
    expect(getAgencies).toHaveBeenCalledWith(server);
    expect(getStopTimes).toHaveBeenCalledWith(server);
    expect(getTrips).toHaveBeenCalledWith(server);
    expect(getShapes).toHaveBeenCalledWith(server);
    expect(getTripsAtStop).toHaveBeenCalledWith(server);
    expect(getRouteStops).toHaveBeenCalledWith(server);
    expect(getActiveTripsOnRoute).toHaveBeenCalledWith(server);
  });
});
