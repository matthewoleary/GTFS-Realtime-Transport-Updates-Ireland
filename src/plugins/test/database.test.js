import { describe, it, expect, vi } from 'vitest';


vi.mock('../../database/databaseClient.js', () => ({
  default: vi.fn(),
}));

import databaseClient from '../../database/databaseClient.js';
import database from '../database.js';

describe('database plugin', () => {
  it('should expose database client on server', async () => {
    const mockConfig = { sql: { foo: 'bar' } };
    const mockDatabaseClientInstance = { db: 'instance' };
    databaseClient.mockResolvedValue(mockDatabaseClientInstance);
    const server = {
      app: { config: mockConfig },
      expose: vi.fn(),
    };
    await database.register(server);
    expect(databaseClient).toHaveBeenCalledWith(server, mockConfig.sql);
    expect(server.expose).toHaveBeenCalledWith('client', mockDatabaseClientInstance);
  });
});
