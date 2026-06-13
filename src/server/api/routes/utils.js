import { getWrappedTimestamp } from '../../../utils/timestampUtils.js';

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