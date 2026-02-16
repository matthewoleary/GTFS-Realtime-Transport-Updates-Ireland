'use-strict';

import { getWrappedTimestamp } from '../../../utils/timestampUtils.js';

/**
 * Removes trips that are at their last stop in the stop_sequence.
 *
 * For each trip, checks if its stop_sequence matches the last stop's stop_sequence.
 * If so, marks the trip as last_stop = true. Returns a filtered array of trips
 * where last_stop is false (i.e., not at their last stop).
 *
 * @param {Array<Array<Object>>} lastStops - An array of arrays, each containing the last stop(s) for a trip.
 * @param {Array<Object>} trips - An array of trip objects to be filtered.
 * @returns {Array<Object>} Filtered array of trips not at their last stop.
 */
export const removeTripsAtLastStop = async (lastStops, trips) => {
	for (let i = 0; i < lastStops.length; i++) {
		// All lastStops[i] are arrays; use the first element
		const lastStop = lastStops[i][0];
		if (lastStop && lastStop.stop_sequence === trips[i].stop_sequence) {
			trips[i].last_stop = true;
		} else {
			trips[i].last_stop = false;
		}
	}

	return trips.filter(result => result.last_stop === false);
};

// Sort routes response by route short name as an integer; eg. route 1, 2, 3...
export const sortByRouteShortNameAsInt = async routes => {
	return routes.sort((a, b) => parseInt(a.route_short_name) - parseInt(b.route_short_name));
}

/**
 * Extracts an array of trimmed, non-empty IDs from a query parameter.
 * Accepts either an array or a comma-separated string.
 *
 * @param {string|string[]} param - The query parameter value.
 * @returns {string[]} Array of extracted IDs.
 */
export function extractIdsFromParam(param) {
	if (Array.isArray(param)) {
		return param.map(id => id.trim()).filter(Boolean);
	}
	if (typeof param === 'string') {
		return param.split(',').map(id => id.trim()).filter(Boolean);
	}
	return [];
}

/**
 * Builds a service day object for GTFS queries, optionally wrapping timestamps for night services.
 *
 * @param {string} dayColumn - The day-of-week column (e.g., 'monday', 'tuesday').
 * @param {string|number} date - The service date (e.g., '20240127').
 * @param {number} lower - The lower bound timestamp (seconds since midnight).
 * @param {number} upper - The upper bound timestamp (seconds since midnight).
 * @returns {Object} Service day object with dayColumn, date, lowerBoundTimestamp, and upperBoundTimestamp.
 */
export function buildServiceDay(dayColumn, date, lower, upper) {
	return {
		dayColumn,
		date,
		lowerBoundTimestamp: lower,
		upperBoundTimestamp: upper
	};
};