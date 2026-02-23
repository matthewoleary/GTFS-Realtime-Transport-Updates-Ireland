import { register } from '../index.js';
import { describe, it, expect, vi } from 'vitest';

describe('plugins index', () => {
  it('should register all plugins', async () => {
    const server = { register: vi.fn() };
    await register(server);
    expect(server.register).toHaveBeenCalledTimes(3);
    expect(server.register).toHaveBeenCalledWith(expect.objectContaining({ name: 'database' }));
    expect(server.register).toHaveBeenCalledWith(expect.objectContaining({ name: 'realtimeTripUpdates' }));
    expect(server.register).toHaveBeenCalledWith(expect.objectContaining({ name: 'realtimeVehiclePositions' }));
  });
});
