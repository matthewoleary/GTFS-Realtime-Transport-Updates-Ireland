import { describe, test, expect, vi } from 'vitest';
// Plain function for hoisted mock
function mockGetWrappedTimestamp(day, date, lower, upper) {
  if (lower === 100) return 1100;
  if (lower === 200) return 1200;
  return lower + 1000;
}
vi.mock('../routes/utils.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getWrappedTimestamp: mockGetWrappedTimestamp
  };
});
import * as utils from '../routes/utils.js';
const { sortByRouteShortNameAsInt, extractIdsFromParam, buildServiceDay } = utils;

describe('sortByRouteShortNameAsInt', () => {
  test('sorts routes by route_short_name as int', async () => {
    const routes = [
      { route_short_name: '10' },
      { route_short_name: '2' },
      { route_short_name: '1' }
    ];
    const result = await sortByRouteShortNameAsInt(routes);
    expect(result.map(r => r.route_short_name)).toEqual(['1', '2', '10']);
  });
});

describe('extractIdsFromParam', () => {
  test('extracts ids from comma-separated string', () => {
    expect(extractIdsFromParam('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  test('extracts ids from array', () => {
    expect(extractIdsFromParam(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
  test('returns empty array for invalid input', () => {
    expect(extractIdsFromParam(undefined)).toEqual([]);
    expect(extractIdsFromParam('')).toEqual([]);
  });
});

describe('buildServiceDay', () => {
  test('returns correct service day object without wrap', () => {
    const result = buildServiceDay('monday', '20240127', 100, 200);
    expect(result).toEqual({
      dayColumn: 'monday',
      date: '20240127',
      lowerBoundTimestamp: 100,
      upperBoundTimestamp: 200
    });
  });
});
