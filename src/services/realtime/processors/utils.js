import gtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { getUnwrappedTimestamp } from '../../../utils/timestampUtils.js';

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
* Unwraps departure and arrival timestamps that exceed 86400 seconds (24 hours).
* Mutates the input element in place.
* @param {Object} element - The stop/trip object. This object will be modified directly.
* @returns {Object} The same element object with unwrapped times.
*/
export function unwrapTimes(element) {
    const departureTimestamp = element.updated_departure_timestamp ?? element.departure_timestamp;
    const arrivalTimestamp = element.updated_arrival_timestamp ?? element.arrival_timestamp;
    if (departureTimestamp >= 86400) {
        const unwrappedTimestamp = getUnwrappedTimestamp(departureTimestamp);
        element.departure_timestamp = unwrappedTimestamp;
        element.departure_time = getTimestampAsTimeFormatted(unwrappedTimestamp);
    }
    if (arrivalTimestamp >= 86400) {
        const unwrappedTimestamp = getUnwrappedTimestamp(arrivalTimestamp);
        element.arrival_timestamp = unwrappedTimestamp;
        element.arrival_time = getTimestampAsTimeFormatted(unwrappedTimestamp);
    }
    return element;
}

export function getTimestampAsTimeFormatted(timestamp) {
    const h = String(Math.floor(timestamp / 3600)).padStart(2, '0');
    const m = String(Math.floor(timestamp / 60) % 60).padStart(2, '0');
    const s = String(timestamp % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}