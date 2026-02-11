/* eslint-disable no-unused-vars */

import agency from './core-gtfs/agency.js';
import calendar from './core-gtfs/calendar.js';
import calendarDates from './core-gtfs/calendar-dates.js';
import feedInfo from './core-gtfs/feed-info.js';
import routes from './core-gtfs/routes.js';
import shapes from './core-gtfs/shapes.js';
import stopTimes from './core-gtfs/stop-times.js';
import stops from './core-gtfs/stops.js';
import trips from './core-gtfs/trips.js';

// Import order of the models matters due to foreign key constraints.
export default [
	agency,
	calendar,
	calendarDates,
	feedInfo,
	routes,
	stops,
	shapes,
	trips,
	stopTimes
];
