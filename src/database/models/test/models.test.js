import { describe, it, expect } from 'vitest';
import models from '../models.js';
import agency from '../core-gtfs/agency.js';
import calendar from '../core-gtfs/calendar.js';
import calendarDates from '../core-gtfs/calendar-dates.js';
import feedInfo from '../core-gtfs/feed-info.js';
import routes from '../core-gtfs/routes.js';
import stops from '../core-gtfs/stops.js';
import shapes from '../core-gtfs/shapes.js';
import trips from '../core-gtfs/trips.js';
import stopTimes from '../core-gtfs/stop-times.js';

describe('models export', () => {
  it('should export an array', () => {
    expect(Array.isArray(models)).toBe(true);
  });

  it('should export models in the correct order', () => {
    expect(models).toEqual([
      agency,
      calendar,
      calendarDates,
      feedInfo,
      routes,
      stops,
      shapes,
      trips,
      stopTimes
    ]);
  });

  it('each model should be an object', () => {
    for (const model of models) {
      expect(typeof model).toBe('object');
      expect(model).not.toBeNull();
    }
  });
});
