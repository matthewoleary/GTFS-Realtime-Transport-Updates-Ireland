import realtimeVehiclePositions from '../realtimeVehiclePositions.js';
import { describe, it, expect, vi } from 'vitest';

describe('realtimeVehiclePositions plugin', () => {
  it('should expose realtimeVehiclePositionsClient on server', async () => {
    const mockConfig = { gtfsr: { foo: 'bar' } };
    const mockClient = { client: 'vehiclePositions' };
    const mockCreateClient = vi.fn().mockResolvedValue(mockClient);
    const server = {
      app: { config: mockConfig },
      expose: vi.fn()
    };
    // Patch the import
    const original = realtimeVehiclePositions.register;
    realtimeVehiclePositions.register = async (srv) => {
      const config = srv.app.config.gtfsr;
      const client = await mockCreateClient(srv, config);
      srv.expose('realtimeVehiclePositionsClient', client);
    };
    await realtimeVehiclePositions.register(server);
    expect(mockCreateClient).toHaveBeenCalledWith(server, mockConfig.gtfsr);
    expect(server.expose).toHaveBeenCalledWith('realtimeVehiclePositionsClient', mockClient);
    realtimeVehiclePositions.register = original;
  });
});
