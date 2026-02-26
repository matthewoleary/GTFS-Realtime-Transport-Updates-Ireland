import { describe, it, expect, vi } from 'vitest';
import * as fileUtils from '../file-utils.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('unzipper', () => ({
  Extract: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    pipe: vi.fn().mockReturnThis(),
    promise: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('file-utils', () => {
  describe('getConfig', () => {
    it('parses valid JSON', async () => {
      const config = '{"foo": "bar"}';
      const result = await fileUtils.getConfig(config);
      expect(result).toEqual({ foo: 'bar' });
    });
    it('throws on invalid JSON', async () => {
      await expect(fileUtils.getConfig('not-json')).rejects.toThrow();
    });
  });

  describe('prepDirectory', () => {
    it('removes and ensures directory', async () => {
      fs.remove.mockResolvedValue();
      fs.ensureDir.mockResolvedValue();
      await fileUtils.prepDirectory('/some/path');
      expect(fs.remove).toHaveBeenCalledWith('/some/path');
      expect(fs.ensureDir).toHaveBeenCalledWith('/some/path');
    });
  });

  describe('unzip', () => {
    it('pipes and resolves promise', async () => {
      // Mock the Extract constructor
      const unzipper = await import('unzipper');
      const Extract = unzipper.Extract;
      Extract.mockClear();

      // Create the piped stream mock (the result of .pipe)
      const pipedStream = {
        on: vi.fn().mockReturnThis(),
        promise: vi.fn().mockResolvedValue('done'),
      };
      // fs.createReadStream returns a stream with .pipe
      const createReadStream = vi.spyOn(fs, 'createReadStream').mockReturnValue({
        pipe: vi.fn().mockReturnValue(pipedStream),
      });

      const result = await fileUtils.unzip('file.zip', 'out/dir');
      expect(createReadStream).toHaveBeenCalledWith('file.zip');
      expect(Extract).toHaveBeenCalledWith({ path: 'out/dir' });
      expect(result).toBe('done');
      // Assert .on was called with 'entry' and a function
      const onCalls = pipedStream.on.mock.calls;
      const entryCall = onCalls.find(call => call[0] === 'entry');
      expect(entryCall).toBeDefined();
      expect(typeof entryCall[1]).toBe('function');
      createReadStream.mockRestore();
    });
  });
});
