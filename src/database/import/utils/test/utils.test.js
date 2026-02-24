import { describe, it, expect } from 'vitest';
import { pluralize, calculateHourTimestamp } from '../utils.js';

describe('utils', () => {
  describe('pluralize', () => {
    it('returns singular for count 1', () => {
      expect(pluralize('cat', 1)).toBe('cat');
    });
    it('returns plural for count not 1', () => {
      expect(pluralize('cat', 2)).toBe('cats');
      expect(pluralize('dog', 0)).toBe('dogs');
    });
  });

  describe('calculateHourTimestamp', () => {
    it('calculates seconds from midnight for valid time', () => {
      expect(calculateHourTimestamp('01:02:03')).toBe(3723);
      expect(calculateHourTimestamp('12:00:00')).toBe(43200);
    });
    it('returns null for invalid time', () => {
      expect(calculateHourTimestamp('12:00')).toBeNull();
      expect(calculateHourTimestamp('not-a-time')).toBeNull();
    });
  });
});
