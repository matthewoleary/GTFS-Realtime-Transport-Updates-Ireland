import { afterEach } from 'vitest';
import sinon from 'sinon';

describe('timestampUtils (migrated from utils.test.js)', () => {
  let clock;

  afterEach(() => {
    if (clock) clock.restore();
  });

  test('getSecondsSinceMidnightTimestamp returns 49410 for 13:43:30', () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 13, 43, 30)));
    const result = timestampUtils.getSecondsSinceMidnightTimestamp();
    expect(result).toBe(49410);
  });

  test('getSecondsSinceMidnightTimestamp returns 0 for 00:00:00', () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 0, 0, 0)));
    const result = timestampUtils.getSecondsSinceMidnightTimestamp();
    expect(result).toBe(0);
  });

  test('getUnixTimestamp returns correct value for 18:09:45 22 Dec 2020', () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 11, 22, 18, 9, 45)));
    const result = timestampUtils.getUnixTimestamp();
    expect(result).toBe(1608660585);
  });

  test('getTimestampMinusNumberMinutes returns 47910 for 49410 minus 25 min', async () => {
    const result = await timestampUtils.getTimestampMinusNumberMinutes(49410, 25);
    expect(result).toBe(47910);
  });

  test('checkIfNightServices returns true for 01:15:00', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 1, 15, 0)));
    const timestamp = timestampUtils.getSecondsSinceMidnightTimestamp();
    expect(timestampUtils.checkIfNightServices(timestamp, 21599)).toBe(true);
  });

  test('checkIfNightServices returns false for 23:59:59', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 23, 59, 59)));
    const timestamp = timestampUtils.getSecondsSinceMidnightTimestamp();
    expect(timestampUtils.checkIfNightServices(timestamp, 21599)).toBe(false);
  });

  test('getWrappedTimestamp returns 89115 for 00:45:15', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 0, 45, 15)));
    const timestamp = timestampUtils.getSecondsSinceMidnightTimestamp();
    expect(timestampUtils.getWrappedTimestamp(timestamp, 21599)).toBe(89115);
  });

  test('getWrappedTimestamp returns 49410 for 13:43:30', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 13, 43, 30)));
    const timestamp = timestampUtils.getSecondsSinceMidnightTimestamp();
    expect(timestampUtils.getWrappedTimestamp(timestamp, 21599)).toBe(49410);
  });
});

import { describe, test, expect, beforeAll } from 'vitest';
import * as timestampUtils from '../timestampUtils.js';
import moment from 'moment-timezone';

describe('timestampUtils', () => {
  beforeAll(() => {
    moment.tz.setDefault('Europe/Dublin');
    moment.locale('en-ie');
  });

  test('getSecondsSinceMidnightTimestamp returns seconds since midnight', () => {
    const now = moment();
    const expected = (now.hour() * 3600) + (now.minute() * 60) + now.second();
    const result = timestampUtils.getSecondsSinceMidnightTimestamp();
    // Allow a 1 second difference due to timing
    expect(Math.abs(result - expected)).toBeLessThanOrEqual(1);
  });

  test('getUnixTimestamp returns current unix timestamp', () => {
    const expected = moment().unix();
    const result = timestampUtils.getUnixTimestamp();
    expect(Math.abs(result - expected)).toBeLessThanOrEqual(1);
  });

  test('getCurrentTime returns time in LTS format', () => {
    const expected = moment().format('LTS');
    const result = timestampUtils.getCurrentTime();
    expect(result).toBe(expected);
  });

  test('getTimestampMinusNumberMinutes subtracts minutes correctly', () => {
    expect(timestampUtils.getTimestampMinusNumberMinutes(600, 5)).toBe(300);
    expect(timestampUtils.getTimestampMinusNumberMinutes(60, 2)).toBe(0);
    expect(timestampUtils.getTimestampMinusNumberMinutes(120, 3)).toBe(0);
  });

  test('getTimestampPlusNumberMinutes adds minutes correctly', () => {
    expect(timestampUtils.getTimestampPlusNumberMinutes(600, 5)).toBe(900);
    expect(timestampUtils.getTimestampPlusNumberMinutes(86300, 2)).toBe(86420);
  });

  test('checkIfNightServices returns true if timestamp is in range', () => {
    expect(timestampUtils.checkIfNightServices(100, 200)).toBe(true);
    expect(timestampUtils.checkIfNightServices(0, 100)).toBe(true);
    expect(timestampUtils.checkIfNightServices(101, 100)).toBe(false);
    expect(timestampUtils.checkIfNightServices(-1, 100)).toBe(false);
  });

  test('getWrappedTimestamp wraps timestamp if needed', () => {
    expect(timestampUtils.getWrappedTimestamp(100, 200)).toBe(100 + 86400);
    expect(timestampUtils.getWrappedTimestamp(300, 200)).toBe(300);
  });

  test('getUnwrappedTimestamp unwraps timestamp if needed', () => {
    expect(timestampUtils.getUnwrappedTimestamp(86500)).toBe(100);
    expect(timestampUtils.getUnwrappedTimestamp(86399)).toBe(86399);
  });
});
