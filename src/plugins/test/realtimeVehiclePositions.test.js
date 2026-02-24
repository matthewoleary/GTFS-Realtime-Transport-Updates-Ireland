import realtimeVehiclePositions from '../realtimeVehiclePositions.js';
import { describe, it, expect, vi } from 'vitest';

const mockClient = { client: 'vehiclePositions' };
const mockCreateClient = vi.fn();
vi.mock('../realtime/clients/realtimeVehiclePositionsClient.js', () => ({
  createRealtimeVehiclePositionsClient: mockCreateClient
}));

describe('realtimeVehiclePositions plugin', () => {
  it('should expose realtimeVehiclePositionsClient on server', async () => {
    const mockConfig = { gtfsr: { foo: 'bar' } };
    mockCreateClient.mockResolvedValue(mockClient);
    const server = {
      app: { config: mockConfig },
      expose: vi.fn()
    };
    await realtimeVehiclePositions.register(server);
    expect(mockCreateClient).toHaveBeenCalledWith(server, mockConfig.gtfsr);
    expect(server.expose).toHaveBeenCalledWith('realtimeVehiclePositionsClient', mockClient);
  });
});
