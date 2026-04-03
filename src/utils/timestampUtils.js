
import moment from 'moment-timezone';
moment.tz.setDefault('Europe/Dublin');
moment.locale('en-ie');

/**
 * Returns the number of seconds since midnight for a given timestamp.
 *
 * @param {string|Date|number} [timestamp] - Optional. A timestamp that can be parsed by moment.js. If omitted, uses the current time.
 * @returns {number} The number of seconds since midnight (0-86399).
 */
export function getSecondsSinceMidnightTimestamp(timestamp) {
	let time = moment(timestamp).format('LTS').split(':');
	time = (Number(time[0]) * 3600) + (Number(time[1]) * 60) + Number(time[2]);
	return time;
}

export function getUnixTimestamp() {
	return moment().unix();
}

export function getCurrentTime() {
	return moment().format('LTS');
}

/**
 * Subtracts a number of minutes from a timestamp (in seconds since midnight).
 * If the result is less than zero, returns zero.
 *
 * @param {number} timestamp - The original timestamp in seconds since midnight.
 * @param {number} numberMinutes - The number of minutes to subtract.
 * @returns {number} The resulting timestamp, or zero if the result is negative.
 */
export function getTimestampMinusNumberMinutes(timestamp, numberMinutes) {
	const numberSeconds = numberMinutes * 60;
	const timestampResult = timestamp - numberSeconds;
	if (timestampResult < 0) {
		return 0;
	}
	return timestampResult;
}

/**
 * Adds a number of minutes to a timestamp (in seconds since midnight).
 *
 * @param {number} timestamp - The original timestamp in seconds since midnight.
 * @param {number} numberMinutes - The number of minutes to add.
 * @returns {number} The resulting timestamp.
 */
export function getTimestampPlusNumberMinutes(timestamp, numberMinutes) {
	const numberSeconds = numberMinutes * 60;
	const timeStampResult = timestamp + numberSeconds;
	return timeStampResult;
}

// Check if time is between 00:00:00 and the latest departure time for the previous service day, which can be early morning hours.
export function checkIfNightServices(timestamp, maximumTimestamp) {
	if (timestamp >= 0 && timestamp <= maximumTimestamp) {
		return true;
	}

	return false;
}

// For services past midnight, we need to make a query using wrapped times
export function getWrappedTimestamp(timestamp, maximumTimestamp) {
	if (timestamp <= maximumTimestamp) {
		timestamp += (24 * 3600);
	}
	return timestamp;
}

export function getUnwrappedTimestamp(timestamp) {
	// If timestamp is not a wrapped timestamp, return the timestamp without change
	if (timestamp < 86400) {
		return timestamp;
	}

	return timestamp - 86400; // Timestamp - 24 hours in seconds
}