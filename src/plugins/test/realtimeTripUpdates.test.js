import realtimeTripUpdates from '../realtimeTripUpdates.js';
import { describe, it, expect, vi } from 'vitest';
import * as realtimeTripUpdatesClient from '../../realtime/clients/realtimeTripUpdatesClient.js';

vi.mock('../../realtime/clients/realtimeTripUpdatesClient.js', () => ({
  createRealtimeTripUpdatesClient: vi.fn(),
}));

describe('realtimeTripUpdates plugin', () => {
  it('should expose realtimeTripUpdatesClient on server', async () => {
    const mockConfig = { gtfsr: { foo: 'bar' } };
    const mockClient = { client: 'tripUpdates' };
    const server = {
      app: { config: mockConfig },
      expose: vi.fn()
    };
    const createRealtimeTripUpdatesClientMock =
      realtimeTripUpdatesClient.createRealtimeTripUpdatesClient;
    createRealtimeTripUpdatesClientMock.mockResolvedValue(mockClient);
    await realtimeTripUpdates.register(server);
    expect(createRealtimeTripUpdatesClientMock).toHaveBeenCalledWith(
      server,
      mockConfig.gtfsr
    );
    expect(server.expose).toHaveBeenCalledWith(
      'realtimeTripUpdatesClient',
      mockClient
    );
  });
});
