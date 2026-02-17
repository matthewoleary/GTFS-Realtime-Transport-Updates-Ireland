import gtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { getUnwrappedTimestamp } from '../../utils/timestampUtils.js';

/**
* Finds the feed entity for a given trip element.
* @param {Object} element - The stop/trip object.
* @param {Map<string, Object>} feedTripIdMap - Map of trip_id to GTFS-realtime feed entity.
* @returns {Object|undefined} The feed entity for the trip, if found.
*/
export function findFeedEntityForTrip(element, feedTripIdMap) {
    return feedTripIdMap.get(element.trip_id);
}

/**
* Calculates the number of minutes until arrival or returns 'Due' if less than 1 minute remains.
*
* @param {number} arrivalTimestamp - The scheduled or real-time arrival timestamp (in seconds).
* @param {number} timestamp - The current timestamp (in seconds).
* @returns {string} The number of minutes until arrival as a string, or 'Due' if less than 1 minute.
*/
export function getDueInValue(arrivalTimestamp, timestamp) {
    const eta = arrivalTimestamp - timestamp;
    return eta >= 60 ? Math.round(eta / 60).toString() : 'Due';
}

/**
* Maps a numeric TripDescriptor.ScheduleRelationship value to its string representation using gtfs-realtime-bindings.
*
* @param {number|undefined} value - The numeric scheduleRelationship value from TripDescriptor.
* @returns {string|undefined} The string representation (e.g., 'SCHEDULED', 'ADDED'), or undefined if not found.
*/
export function getTripDescriptorScheduleRelationshipName(value) {
    const ScheduleRelationship = gtfsRealtimeBindings.transit_realtime.TripDescriptor.ScheduleRelationship;
    return Object.keys(ScheduleRelationship).find(key => ScheduleRelationship[key] === value);
}

/**
* Sorts a list of trip elements by arrival timestamp (soonest first).
* @param {Array<Object>} tripList - List of trip elements.
* @returns {Array<Object>} Sorted list by arrival time.
*/
export function sortByArrival(tripList) {
    return tripList.sort((a, b) =>
        a.arrival_timestamp > b.arrival_timestamp ? 1 :
        a.arrival_timestamp < b.arrival_timestamp ? -1 : 0
    );
}

/**
* Unwraps departure and arrival timestamps that exceed 86400 seconds (24 hours).
* Mutates the input element in place.
* @param {Object} element - The stop/trip object. This object will be modified directly.
* @returns {Object} The same element object with unwrapped times.
*/
export function unwrapTimes(element) {
    if (element.departure_timestamp >= 86400) {
        const unwrappedTimestamp = getUnwrappedTimestamp(element.departure_timestamp);
        element.departure_timestamp = unwrappedTimestamp;
        element.departure_time = getTimestampAsTimeFormatted(unwrappedTimestamp);
    }
    if (element.arrival_timestamp >= 86400) {
        const unwrappedTimestamp = getUnwrappedTimestamp(element.arrival_timestamp);
        element.arrival_timestamp = unwrappedTimestamp;
        element.arrival_time = getTimestampAsTimeFormatted(unwrappedTimestamp);
    }
    return element;
}

export function getTimestampAsTimeFormatted(timestamp) {
	const h = String(Math.floor(Math.floor(timestamp / 3600))).padStart(2, '0');
	const m = String(Math.floor(Math.floor(timestamp / 60) % 60) % 60).padStart(2, '0');
	const s = String(timestamp % 60).padStart(2, '0');
	return `${h}:${m}:${s}`;
}