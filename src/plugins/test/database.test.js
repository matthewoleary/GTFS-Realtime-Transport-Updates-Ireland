import database from '../database.js';
import { describe, it, expect, vi } from 'vitest';

describe('database plugin', () => {
  it('should expose database client on server', async () => {
    const mockConfig = { sql: { foo: 'bar' } };
    const mockDatabaseClientInstance = { db: 'instance' };
    const mockDatabaseClient = vi.fn().mockResolvedValue(mockDatabaseClientInstance);
    const server = {
      app: { config: mockConfig },
      expose: vi.fn()
    };
    // Patch the import
    const original = database.register;
    database.register = async (srv) => {
      const config = srv.app.config.sql;
      const databaseClientInstance = await mockDatabaseClient(srv, config);
      srv.expose('client', databaseClientInstance);
    };
    await database.register(server);
    expect(mockDatabaseClient).toHaveBeenCalledWith(server, mockConfig.sql);
    expect(server.expose).toHaveBeenCalledWith('client', mockDatabaseClientInstance);
    database.register = original;
  });
});
