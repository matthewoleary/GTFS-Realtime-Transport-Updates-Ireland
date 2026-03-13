
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs-extra', () => ({
  default: {
    writeFile: vi.fn(),
    existsSync: vi.fn(),
  },
}));

describe('MysqlImporter (isolated importFiles skip test)', () => {
  it('should skip excluded files and handle missing files', async () => {
    const fs = (await import('fs-extra')).default;
    const { default: MysqlImporter } = await import('../mysql-import.js');
    const models = [
      { filenameBase: 'table1', schema: [{ name: 'id' }] }
    ];
    const dbClientInstance = {};
    const importer = new MysqlImporter({ agencies: [] }, { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, dbClientInstance, models);
    importer.cnx = { query: vi.fn().mockResolvedValue() };
    // Spy on fs.existsSync
    const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const task = { exclude: ['table1'], downloadDir: '/tmp', log: vi.fn() };
    await importer.importFiles(task);
    // Should skip import for excluded file (among other log calls)
    expect(
      task.log.mock.calls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Skipping - table1.txt'))
      )
    ).toBe(true);
    existsSyncSpy.mockRestore();
  });
});
