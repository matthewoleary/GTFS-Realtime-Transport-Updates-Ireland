import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addCustomTimestampColumns,
  addCustomColumns,
  addFeedInfoLastUpdatedColumn,
  updateFeedInfoLastUpdatedValues
} from '../custom-queries.js';

describe('custom-queries', () => {
  let task;
  beforeEach(() => {
    task = {
      cnx: { query: vi.fn().mockResolvedValue() },
      warn: vi.fn()
    };
  });

  describe('addCustomTimestampColumns', () => {
    it('should add departure_timestamp and arrival_timestamp columns and update model schema', async () => {
      const model = { schema: [] };
      await addCustomTimestampColumns(task, model);
      // Should call query for both columns
        expect(task.cnx.query).toHaveBeenCalledWith(
          expect.stringMatching(/ALTER TABLE stop_times ADD COLUMN departure_timestamp integer\s+AFTER departure_time/)
        );
        expect(task.cnx.query).toHaveBeenCalledWith(
          expect.stringMatching(/ALTER TABLE stop_times ADD COLUMN arrival_timestamp integer\s+AFTER arrival_time/)
        );
      // Should update model.schema
      expect(model.schema.some(col => col.name === 'departure_timestamp')).toBe(true);
      expect(model.schema.some(col => col.name === 'arrival_timestamp')).toBe(true);
    });
    it('should warn and throw on error', async () => {
      // Simulate query error
      task.cnx.query.mockRejectedValueOnce(new Error('fail'));
      const model = { schema: [] };
      await expect(addCustomTimestampColumns(task, model)).rejects.toThrow('fail');
      expect(task.warn).toHaveBeenCalledWith('Error adding columns to stop_times table');
    });
  });

  describe('addCustomColumns', () => {
    it('should call query with correct SQL for each column', async () => {
      const columns = [
        { name: 'foo', type: 'INTEGER', required: true, identity: true, first: true },
        { name: 'bar', type: 'TEXT', required: false, after: 'baz' }
      ];
      await addCustomColumns(task, 'table', columns);
      expect(task.cnx.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE table ADD COLUMN foo INTEGER NOT NULL AUTO_INCREMENT FIRST')
      );
      // Allow for possible extra spaces before AFTER
      expect(task.cnx.query).toHaveBeenCalledWith(
        expect.stringMatching(/ALTER TABLE table ADD COLUMN bar TEXT\s+AFTER baz/)
      );
    });
    it('should throw on query error', async () => {
      task.cnx.query.mockRejectedValueOnce(new Error('fail'));
      await expect(addCustomColumns(task, 'table', [{ name: 'foo', type: 'INTEGER' }])).rejects.toThrow('fail');
    });
  });

  describe('addFeedInfoLastUpdatedColumn', () => {
    it('should call query with correct SQL', async () => {
      await addFeedInfoLastUpdatedColumn(task);
      expect(task.cnx.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE feed_info ADD feed_last_updated DATETIME')
      );
    });
    it('should warn and throw on error', async () => {
      task.cnx.query.mockRejectedValueOnce(new Error('fail'));
      await expect(addFeedInfoLastUpdatedColumn(task)).rejects.toThrow('fail');
      expect(task.warn).toHaveBeenCalledWith('Error adding feed_last_updated to feed_info');
    });
  });

  describe('updateFeedInfoLastUpdatedValues', () => {
    it('should call query with correct SQL', async () => {
      await updateFeedInfoLastUpdatedValues(task);
      expect(task.cnx.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feed_info')
      );
    });
    it('should warn and throw on error', async () => {
      task.cnx.query.mockRejectedValueOnce(new Error('fail'));
      await expect(updateFeedInfoLastUpdatedValues(task)).rejects.toThrow('fail');
      expect(task.warn).toHaveBeenCalledWith('Error updating feed_last_updated in feed_info');
    });
  });
});
