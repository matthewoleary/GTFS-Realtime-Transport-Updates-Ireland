import { describe, test, expect, vi } from 'vitest';
import { registerRoutes } from '../routes/routes.js';

vi.mock('../routes/getStops.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getRoutes.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getAgencies.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getStopTimesForTrip.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getTrips.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getShapes.js', () => ({ default: vi.fn() }));
vi.mock('../routes/getTripsAtStop.js', () => ({ default: vi.fn() }));

describe('registerRoutes', () => {
  test('calls all route registration functions', async () => {
    const server = {};
    await registerRoutes(server);
    const getStops = (await import('../routes/getStops.js')).default;
    const getRoutes = (await import('../routes/getRoutes.js')).default;
    const getAgencies = (await import('../routes/getAgencies.js')).default;
    const getStopTimesForTripRoute = (await import('../routes/getStopTimesForTrip.js')).default;
    const getTripsRoute = (await import('../routes/getTrips.js')).default;
    const getShapesRoute = (await import('../routes/getShapes.js')).default;
    const getTripsAtStopRoute = (await import('../routes/getTripsAtStop.js')).default;
    expect(getStops).toHaveBeenCalledWith(server);
    expect(getRoutes).toHaveBeenCalledWith(server);
    expect(getAgencies).toHaveBeenCalledWith(server);
    expect(getStopTimesForTripRoute).toHaveBeenCalledWith(server);
    expect(getTripsRoute).toHaveBeenCalledWith(server);
    expect(getShapesRoute).toHaveBeenCalledWith(server);
    expect(getTripsAtStopRoute).toHaveBeenCalledWith(server);
  });
});
