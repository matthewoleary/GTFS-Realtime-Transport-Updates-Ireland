import { unwrapTimes, getTripDescriptorScheduleRelationshipName, findFeedEntityForTrip, getTimestampAsTimeFormatted, getDueInValue, sortByArrival } from "./utils.js";

class RealtimeTripUpdatesProcessor {
	/**
	 * Registers the processor with feed timestamp and tripIdMap accessors.
	 * @param {Function} getFeedTimestamp - Async function to get feed timestamp.
	 * @param {Function} getFeedTripIdMap - Async function to get feed tripId map.
	 * @returns {Object} Object with updateResultsWithRealtime method.
	 */
	static async register(getFeedTimestamp, getFeedTripIdMap) {
		const processor = new RealtimeTripUpdatesProcessor();
		/**
		 * Updates query results with realtime information.
		 * @param {Object} query - The query object to update.
		 * @returns {Object} The updated query object.
		 */
		const updateResultsWithRealtimeTripUpdates = async query => {
			const feedTimestamp = await getFeedTimestamp();
			const feedTripIdMap = await getFeedTripIdMap();
			if (feedTimestamp && feedTripIdMap) {
				try {
					query.realtime_trip_updates_feed_timestamp = feedTimestamp;
					const secondsSinceMidnightTimestamp = query.since_midnight_timestamp;
					query.response = await processor.processStopResponse(query.response, feedTripIdMap, secondsSinceMidnightTimestamp);
				} catch (error) {
					// Log error if realtime information is unavailable
					this.logger.error('No realtime trip updates information available. Error:', error);
				}
			}
			return query;
		};
		return {
			updateResultsWithRealtimeTripUpdates
		};
	}

	/**
	 * Processes a list of stop/trip elements, applying real-time updates, marking arrivals, and unwrapping times.
	 *
	 * For each element:
	 *   - Looks up the corresponding GTFS-realtime feed entity and sets the scheduleRelationship (defaults to undefined if not found).
	 *   - Applies real-time delay if not canceled (scheduleRelationship !== 3).
	 *   - Marks arrival or due_in, and unwraps times if needed.
	 *   - Filters out elements that have already arrived or have scheduleRelationship === 7 (GTFS-realtime DELETED).
	 *   - Sorts the result by arrival time.
	 *
	 * @param {Array<Object>} stopResponse - Array of stop/trip elements to process.
	 * @param {Map<string, Object>} feedEntityMap - Map of trip_id to GTFS-realtime feed entity.
	 * @param {number} secondsSinceMidnightTimestamp - Current timestamp in seconds since midnight.
	 * @returns {Promise<Array<Object>>} Filtered and sorted array of updated stop/trip elements.
	 */
	async processStopResponse(stopResponse, feedEntityMap, secondsSinceMidnightTimestamp) {
		const filteredResponse = [];
		for (const element of stopResponse) {
			const feedEntity = findFeedEntityForTrip(element, feedEntityMap);
			const scheduleRelationshipValue = feedEntity ? feedEntity.tripUpdate.trip.scheduleRelationship : 0;
			element.tripScheduleRelationship = getTripDescriptorScheduleRelationshipName(scheduleRelationshipValue);
			// if feedEntity.tripUpdate.stopTimeUpdate exists, check if an update is provided for element.stop_id
			// If a scheduleRelationship is present, update element.scheduleRelationship to that value.
			this.applyStopScheduleRelationshipIfPresent(element, feedEntity);
			// If the tripScheduleRelationship is not CANCELED (3), apply real-time delay
			if (feedEntity && element.tripScheduleRelationship !== 'CANCELED') {
				element = this.applyRealtimeDelay(element, feedEntity);
			} else if (element.vehicle) {
				element.is_realtime = true;
			} else {
				element.is_realtime = false;
			}
			element = this.markArrivalAndDueIn(element, secondsSinceMidnightTimestamp);
			element = unwrapTimes(element);
			if (!element.arrived) {
				filteredResponse.push(element);
			}
		}
		return sortByArrival(filteredResponse);
	}

	/**
	 * Applies real-time delay information to a stop/trip element using GTFS-realtime feed entity data.
	 *
	 * If the element is not marked as "CANCELED" (scheduleRelationship !== 3),
	 * sets is_realtime to true and updates the element's timestamps and times
	 * using the nearest stop delay from the feed entity's stopTimeUpdate array.
	 *
	 * @param {Object} element - The stop/trip object to update (mutated in place).
	 * @param {Object} feedEntity - The GTFS-realtime feed entity containing tripUpdate data.
	 * @returns {Object} The updated element with real-time delay applied if available.
	 */
	applyRealtimeDelay(element, feedEntity) {
		if (feedEntity.tripUpdate.stopTimeUpdate) {
			const stopTimeUpdates = feedEntity.tripUpdate.stopTimeUpdate;
			element = this.findNearestStopSequenceDelay(element, stopTimeUpdates);
			element.is_realtime = true;
		}
		return element;
	}

	/**
	 * Finds the most recent stopTimeUpdate in the stop sequence that is less than or equal to the current stop.
	 * Applies the corresponding departure and arrival delays to the element's timestamps and updates the formatted times.
	 * 
	 * Below context from: https://gtfs.org/documentation/realtime/feed-entities/trip-updates/#stoptimeupdate
	 * 
	 * If one or more stops are missing along the trip the delay from the update 
	 * (or, if only time is provided in the update, a delay computed by comparing the time against the GTFS schedule time) 
	 * is propagated to all subsequent stops. 
	 * This means that updating a stop time for a certain stop will change all subsequent stops in the absence of any other information. 
	 * Note that updates with a schedule relationship of SKIPPED will not stop delay propagation, 
	 * but updates with schedule relationships of SCHEDULED (also the default value if schedule relationship is not provided) or NO_DATA will.
	 * 
	 * scheduleRelationship: (per GTFS-realtime spec)
	 *  0 = SCHEDULED
	 *  1 = SKIPPED
	 *  2 = NO_DATA 
	 *  3 = UNSCHEDULED
	 *
	 * @param {Object} element - The stop/trip object to update (mutated in place).
	 * @param {Array<Object>} stopTimeUpdates - Array of stopTimeUpdate objects from the GTFS-realtime feed.
	 * @returns {Object} The updated element with delay applied from the nearest stopTimeUpdate.
	 */
	findNearestStopSequenceDelay(element, stopTimeUpdates) {
		for (let index = stopTimeUpdates.length - 1; index >= 0; index--) {
			const update = stopTimeUpdates[index];
			if (
				update.stopSequence <= element.stop_sequence &&
				(update.scheduleRelationship === 0 || update.scheduleRelationship === 2)
			) {
				const departureDelay = update.departure ? update.departure.delay : 0;
				const arrivalDelay = update.arrival ? update.arrival.delay : 0;
				element.departure_timestamp += departureDelay;
				element.arrival_timestamp += arrivalDelay;
				element.departure_time = getTimestampAsTimeFormatted(element.departure_timestamp);
				element.arrival_time = getTimestampAsTimeFormatted(element.arrival_timestamp);
				break;
			}
		}
		return element;
	}

	applyStopScheduleRelationshipIfPresent(element, feedEntity) {
		if (feedEntity && feedEntity.tripUpdate.stopTimeUpdate) {
			const stopTimeUpdateForStop = feedEntity.tripUpdate.stopTimeUpdate.find(
				update => update.stopId === element.stop_id
			);
			if (stopTimeUpdateForStop && stopTimeUpdateForStop.scheduleRelationship !== undefined) {
				element.stopScheduleRelationship = getTripDescriptorScheduleRelationshipName(stopTimeUpdateForStop.scheduleRelationship);
			}
		}
		return element;
	}

	/**
	 * Marks arrival or due_in for a stop/trip element based on current timestamp.
	 * @param {Object} element - The stop/trip object.
	 * @param {number} secondsSinceMidnightTimestamp - Current timestamp in seconds since midnight.
	 * @returns {Object} The updated element with arrival/due_in status.
	 */
	markArrivalAndDueIn(element, secondsSinceMidnightTimestamp) {
		const departureTimestamp = element.departure_timestamp;
		const arrivalTimestamp = element.arrival_timestamp;
		if (departureTimestamp) {
			if (departureTimestamp < secondsSinceMidnightTimestamp) {
				element.arrived = true;
			} else {
				element.due_in = getDueInValue(departureTimestamp, secondsSinceMidnightTimestamp);
			}
		} else if (arrivalTimestamp) {
			if (arrivalTimestamp < secondsSinceMidnightTimestamp) {
				element.arrived = true;
			} else {
				element.due_in = getDueInValue(arrivalTimestamp, secondsSinceMidnightTimestamp);
			}
		} else {
			// Error handling for missing timestamps
			this.logger.error('No departure or arrival timestamp available for element:', element);
		}
		return element;
	}
}

export default RealtimeTripUpdatesProcessor;