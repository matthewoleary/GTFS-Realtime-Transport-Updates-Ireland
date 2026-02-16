import { describe, test, expect, beforeAll, afterEach } from 'vitest';
import sinon from 'sinon';

describe('dateUtils (migrated from utils.test.js)', () => {
  let clock;

  afterEach(() => {
    if (clock) clock.restore();
  });

  test('getCurrentDay returns correct day for fixed date', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 13, 43, 30)));
    const result = await dateUtils.getCurrentDay();
    expect(result).toBe('Tuesday');
  });

  test('getCurrentDate returns correct date for fixed date', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 24, 13, 43, 30)));
    const result = await dateUtils.getCurrentDate();
    expect(result).toBe('20201124');
  });

  test('getNextDay returns correct next day for Friday', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 27, 11, 27, 30)));
    const result = await dateUtils.getNextDay();
    expect(result).toBe('Saturday');
  });

  test('getNextDay returns correct next day for Thursday on 31st Dec 2020', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 11, 31, 23, 0, 0)));
    const result = await dateUtils.getNextDay();
    expect(result).toBe('Friday');
  });

  test('getNextDayDate returns correct next date for 27th Nov 2020', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 10, 27, 11, 27, 30)));
    const result = await dateUtils.getNextDayDate();
    expect(result).toBe('20201128');
  });

  test('getNextDayDate returns correct next date for 31st Dec 2020', async () => {
    clock = sinon.useFakeTimers(new Date(Date.UTC(2020, 11, 31, 23, 0, 0)));
    const result = await dateUtils.getNextDayDate();
    expect(result).toBe('20210101');
  });
});
import * as dateUtils from '../dateUtils.js';
import moment from 'moment-timezone';
import { describe, test, expect, beforeAll } from 'vitest';

describe('dateUtils', () => {
  beforeAll(() => {
    moment.tz.setDefault('Europe/Dublin');
    moment.locale('en-ie');
  });

  test('getCurrentDate returns today in YYYYMMDD', async () => {
    const expected = moment().format('YYYYMMDD');
    const result = await dateUtils.getCurrentDate();
    expect(result).toBe(expected);
  });

  test('getCurrentDay returns today as day name', async () => {
    const expected = moment().format('dddd');
    const result = await dateUtils.getCurrentDay();
    expect(result).toBe(expected);
  });

  test('getPreviousDate returns yesterday in YYYYMMDD', async () => {
    const expected = moment().subtract(1, 'd').format('YYYYMMDD');
    const result = await dateUtils.getPreviousDate();
    expect(result).toBe(expected);
  });

  test('getPreviousDay returns yesterday as day name', async () => {
    const expected = moment().subtract(1, 'd').format('dddd');
    const result = await dateUtils.getPreviousDay();
    expect(result).toBe(expected);
  });

  test('getNextDayDate returns tomorrow in YYYYMMDD', async () => {
    const expected = moment().add(1, 'd').format('YYYYMMDD');
    const result = await dateUtils.getNextDayDate();
    expect(result).toBe(expected);
  });

  test('getNextDay returns tomorrow as day name', async () => {
    const expected = moment().add(1, 'd').format('dddd');
    const result = await dateUtils.getNextDay();
    expect(result).toBe(expected);
  });
});
