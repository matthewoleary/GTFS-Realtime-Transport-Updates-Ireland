import realtimeTripUpdates from '../realtimeTripUpdates.js';
import { describe, it, expect, vi } from 'vitest';

describe('realtimeTripUpdates plugin', () => {
  it('should expose realtimeTripUpdatesClient on server', async () => {
    const mockConfig = { gtfsr: { foo: 'bar' } };
    const mockClient = { client: 'tripUpdates' };
    const mockCreateClient = vi.fn().mockResolvedValue(mockClient);
    const server = {
      app: { config: mockConfig },
      expose: vi.fn()
    };
    // Patch the import
    const original = realtimeTripUpdates.register;
    realtimeTripUpdates.register = async (srv) => {
      const config = srv.app.config.gtfsr;
      const client = await mockCreateClient(srv, config);
      srv.expose('realtimeTripUpdatesClient', client);
    };
    await realtimeTripUpdates.register(server);
    expect(mockCreateClient).toHaveBeenCalledWith(server, mockConfig.gtfsr);
    expect(server.expose).toHaveBeenCalledWith('realtimeTripUpdatesClient', mockClient);
    realtimeTripUpdates.register = original;
  });
});
