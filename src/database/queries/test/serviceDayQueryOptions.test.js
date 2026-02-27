import { describe, it, expect } from 'vitest';
import ServiceDayQueryOptions from '../serviceDayQueryOptions.js';

describe('ServiceDayQueryOptions', () => {
  it('should set all properties from constructor options', () => {
    const options = {
      dayColumn: 'monday',
      date: '20260227',
      upperBoundTimestamp: 39600,
      lowerBoundTimestamp: 36000
    };
    const serviceDay = new ServiceDayQueryOptions(options);
    expect(serviceDay.dayColumn).toBe('monday');
    expect(serviceDay.date).toBe('20260227');
    expect(serviceDay.upperBoundTimestamp).toBe(39600);
    expect(serviceDay.lowerBoundTimestamp).toBe(36000);
  });

  it('should set properties to undefined if not provided', () => {
    const serviceDay = new ServiceDayQueryOptions({});
    expect(serviceDay.dayColumn).toBeUndefined();
    expect(serviceDay.date).toBeUndefined();
    expect(serviceDay.upperBoundTimestamp).toBeUndefined();
    expect(serviceDay.lowerBoundTimestamp).toBeUndefined();
  });

  it('should allow falsy values (0, empty string)', () => {
    const options = {
      dayColumn: '',
      date: '',
      upperBoundTimestamp: 0,
      lowerBoundTimestamp: 0
    };
    const serviceDay = new ServiceDayQueryOptions(options);
    expect(serviceDay.dayColumn).toBe('');
    expect(serviceDay.date).toBe('');
    expect(serviceDay.upperBoundTimestamp).toBe(0);
    expect(serviceDay.lowerBoundTimestamp).toBe(0);
  });
});
