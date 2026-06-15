import { unwrapTimes, getTripDescriptorScheduleRelationshipName, findFeedEntityForTrip, getTimestampAsTimeFormatted } from "./utils.js";
import { getSecondsSinceMidnightTimestamp } from "../../../utils/timestampUtils.js";

class RealtimeTripUpdatesProcessor {
	/**
	 * @param {Object} logger - Logger instance with error/info methods.
	 */
	constructor(logger = console) {
		this.logger = logger;
	}

	/**
	 * Registers the processor with feed timestamp and tripIdMap accessors.
	 * @param {Function} getFeedTimestamp - Async function to get feed timestamp.
	 * @param {Function} getFeedTripIdMap - Async function to get feed tripId map.
	 * @returns {Object} Object with updateResultsWithRealtime method.
	 */
	static async register(getFeedTimestamp, getFeedTripIdMap, logger = console) {
		const processor = new RealtimeTripUpdatesProcessor(logger);

		/**
		 * Update the query for a single trip with the realtime trip update object if available.
		 * @param {Object} query - The query object to update.
		 * @returns {Object} The updated query object.
		 */
		const updateTripWithRealtimeUpdates = async query => {
			const feedTimestamp = await getFeedTimestamp();
			const feedTripIdMap = await getFeedTripIdMap();
			if (feedTimestamp && feedTripIdMap) {
				try {
					query.realtime_trip_updates_feed_timestamp = feedTimestamp;
					query.response = await processor.processTripResponse(query.response, feedTripIdMap);
				} catch (error) {
					processor.logger.error(`No realtime trip updates information available. Error: ${error.message}`);
				}
			}
			return query;
		}

		/**
		 * Update the query for each trip arriving at a stop with the related realtime stop updates for each trip along with updated departure/arrival times.
		 * @param {Object} query - The query object to update.
		 * @returns {Object} The updated query object.
		 */
		const updateStopWithRealtimeUpdates = async query => {
			const feedTimestamp = await getFeedTimestamp();
			const feedTripIdMap = await getFeedTripIdMap();
			if (feedTimestamp && feedTripIdMap) {
				try {
					query.realtime_trip_updates_feed_timestamp = feedTimestamp;
					const secondsSinceMidnightTimestamp = getSecondsSinceMidnightTimestamp(query.timestamp);
					if (Array.isArray(query.response)) {
						query.response = await processor.processTripsAtStopResponse(query.response, feedTripIdMap, secondsSinceMidnightTimestamp);
					} else {
						processor.logger.warn('Query response is not an array, skipping stop updates processing.', query.response);
					}
				} catch (error) {
					processor.logger.error(`No realtime trip updates information available. Error: ${error.message}`);
				}
			}
			return query;
		}

		const updateStopTimesWithRealtimeUpdates = async query => {
			const feedTimestamp = await getFeedTimestamp();
			const feedTripIdMap = await getFeedTripIdMap();
			if (feedTimestamp && feedTripIdMap) {
				try {
					query.realtime_trip_updates_feed_timestamp = feedTimestamp;
					if (Array.isArray(query.response)) {
						query.response = await processor.processStopTimesResponse(query.response, feedTripIdMap);
					} else {
						processor.logger.warn('Query response is not an array, skipping stop times updates processing.', query.response);
					}
				} catch (error) {
					processor.logger.error(`No realtime trip updates information available. Error: ${error.message}`);
				}
			}
			return query;
		}

		return {
			updateTripWithRealtimeUpdates,
			updateStopWithRealtimeUpdates,
			updateStopTimesWithRealtimeUpdates
		};
	}

	/**
	 * Processes a list of stop/trip elements, applying real-time updates, marking arrivals, and unwrapping times.
	 *
	 * For each element in stopResponse:
	 *   - Creates a shallow copy to avoid mutating the input array.
	 *   - Looks up the corresponding GTFS-realtime feed entity and sets the scheduleRelationship (defaults to undefined if not found).
	 *   - Applies real-time delay if not canceled (scheduleRelationship !== 3).
	 *   - Marks arrival, and unwraps times if needed.
	 *   - Filters out elements that have already arrived or have scheduleRelationship === 7 (GTFS-realtime DELETED).
	 *   - Sorts the result by arrival time.
	 *
	 * @param {Array<Object>} stopResponse - Array of stop/trip elements to process.
	 * @param {Map<string, Object>} feedEntityMap - Map of trip_id to GTFS-realtime feed entity.
	 * @param {number} secondsSinceMidnightTimestamp - Current timestamp in seconds since midnight.
	 * @returns {Promise<Array<Object>>} Filtered and sorted array of updated stop/trip elements.
	 */
	async processTripsAtStopResponse(stopResponse, feedEntityMap, secondsSinceMidnightTimestamp) {
		const filteredResponse = [];
		for (const origElement of stopResponse) {
			let element = { ...origElement };
			const feedEntity = findFeedEntityForTrip(element, feedEntityMap);
			element.tripUpdate = feedEntity?.tripUpdate;
			element.stopUpdate = feedEntity?.tripUpdate?.stopTimeUpdate?.find(update => {
				if (element.stop_sequence !== undefined && update.stopSequence !== undefined) {
					return update.stopSequence === element.stop_sequence;
				}
				return update.stopId === element.stop_id;
			});
			// If the tripScheduleRelationship is not CANCELED (3), apply real-time delay
			if (feedEntity && element.tripUpdate?.trip.scheduleRelationship !== 3) {
				element = this.applyRealtimeDelay(element, feedEntity);
			}
			const arrived = this.checkArrival(element, secondsSinceMidnightTimestamp);
			element = unwrapTimes(element);
			if (!arrived) {
				filteredResponse.push(element);
			}
		}
		return this.sortByArrival(filteredResponse);
	}

	/**
	 * Processes stop times responses by attaching matching realtime stop time updates to each stop time entry.
	 *
	 * @param {Array<Object>} stopTimesResponse - Array of stop time objects to enrich with realtime updates.
	 * @param {Map<string, Object>} feedEntityMap - Map of trip identifiers to GTFS-realtime feed entities.
	 * @returns {Array<Object>} The enriched stop time response array with attached stopTimeUpdate data when available.
	 */
	async processStopTimesResponse(stopTimesResponse, feedEntityMap) {
		const feedEntity = findFeedEntityForTrip(stopTimesResponse[0], feedEntityMap);
		if (feedEntity) {
			if (feedEntity.tripUpdate && feedEntity.tripUpdate.stopTimeUpdate) {
				for (const stopTime of stopTimesResponse) {
					const stopTimeUpdate = feedEntity.tripUpdate.stopTimeUpdate.find(update => {
						if (stopTime.stop_sequence !== undefined && update.stopSequence !== undefined) {
							return update.stopSequence === stopTime.stop_sequence;
						}
						return update.stopId === stopTime.stop_id;
					});
					if (stopTimeUpdate) {
						stopTime.stopTimeUpdate = stopTimeUpdate;
					}
				}
			}
		}
		return stopTimesResponse;
	}

	/**
	 * Processes a single trip response by attaching the matching realtime trip update data when available.
	 *
	 * @param {Object} tripResponse - The trip response object to enrich.
	 * @param {Map<string, Object>} feedEntityMap - Map of trip identifiers to GTFS-realtime feed entities.
	 * @returns {Object} The enriched trip response with attached tripUpdate data when available.
	 */
	async processTripResponse(tripResponse, feedEntityMap) {
		const feedEntity = findFeedEntityForTrip(tripResponse, feedEntityMap);
		tripResponse.tripUpdate = feedEntity?.tripUpdate;
		return tripResponse;
	}

	/**
	 * Applies real-time delay information from a GTFS-realtime feed entity to a stop/trip element.
	 *
	 * If the feed entity contains stopTimeUpdate entries, the method resolves the nearest applicable
	 * update and writes the resulting realtime departure and arrival timestamps and formatted times
	 * onto the element.
	 *
	 * @param {Object} element - The stop/trip object to update. The method mutates this object in place.
	 * @param {Object} feedEntity - The GTFS-realtime feed entity containing tripUpdate data.
	 * @returns {Object} The updated element with realtime timestamps applied when an applicable update exists.
	 */
	applyRealtimeDelay(element, feedEntity) {
		if (feedEntity?.tripUpdate?.stopTimeUpdate) {
			const stopTimeUpdates = feedEntity.tripUpdate.stopTimeUpdate;
			element = this.findNearestStopSequenceDelay(element, stopTimeUpdates);
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
	 * @param {Object} element - The stop/trip object to update. The method mutates this object in place.
	 * @param {Array<Object>} stopTimeUpdates - Array of stopTimeUpdate objects from the GTFS-realtime feed.
	 * @returns {Object} The updated element with realtime departure/arrival timestamps and formatted times
	 * set when an applicable update is found.
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
				element.realtime_departure_timestamp = element.departure_timestamp + departureDelay;
				element.realtime_arrival_timestamp = element.arrival_timestamp + arrivalDelay;
				element.realtime_departure_time = getTimestampAsTimeFormatted(element.realtime_departure_timestamp);
				element.realtime_arrival_time = getTimestampAsTimeFormatted(element.realtime_arrival_timestamp);
				break;
			}
		}
		return element;
	}

	applyStopScheduleRelationshipIfPresent(element, feedEntity) {
		if (feedEntity && feedEntity?.tripUpdate?.stopTimeUpdate) {
			const stopTimeUpdateForStop = feedEntity.tripUpdate.stopTimeUpdate.find(update => {
				if (element.stop_sequence !== undefined && update.stopSequence !== undefined) {
					return update.stopSequence === element.stop_sequence;
				}
				return update.stopId === element.stop_id;
			});
			if (stopTimeUpdateForStop && stopTimeUpdateForStop.scheduleRelationship !== undefined) {
				element.stopScheduleRelationship = getTripDescriptorScheduleRelationshipName(stopTimeUpdateForStop.scheduleRelationship);
			}
		}
		return element;
	}

	/**
	 * Returns true/false for a stop/trip element based on its arrival status relative to the current timestamp.
	 * @param {Object} element - The stop/trip object.
	 * @param {number} secondsSinceMidnightTimestamp - Current timestamp in seconds since midnight.
	 * @returns {Object} The updated element with 'arrived' property set to true if the trip has already arrived.
	 */
	checkArrival(element, secondsSinceMidnightTimestamp) {
		const departureTimestamp = element.realtime_departure_timestamp ?? element.departure_timestamp;
		const arrivalTimestamp = element.realtime_arrival_timestamp ?? element.arrival_timestamp;
		let arrived = false;
		if (departureTimestamp) {
			if (departureTimestamp < secondsSinceMidnightTimestamp) {
				arrived = true;
			}
		} else if (arrivalTimestamp) {
			if (arrivalTimestamp < secondsSinceMidnightTimestamp) {
				arrived = true;
			}
		} else {
			this.logger.error('No departure or arrival timestamp available for element:', element);
		}
		return arrived;
	}

	/**
	* Sorts a list of trip elements by arrival timestamp (soonest first).
	* @param {Array<Object>} tripList - List of trip elements.
	* @returns {Array<Object>} Sorted list by arrival time.
	*/
	sortByArrival(tripList) {
		return tripList.sort((a, b) => {
			const aArrival = a.unwrapped_arrival_timestamp ?? a.realtime_arrival_timestamp ?? a.arrival_timestamp;
			const bArrival = b.unwrapped_arrival_timestamp ?? b.realtime_arrival_timestamp ?? b.arrival_timestamp;
	
			if (aArrival > bArrival) {
				return 1;
			}
	
			if (aArrival < bArrival) {
				return -1;
			}
	
			return 0;
		});
	}
}

export default RealtimeTripUpdatesProcessor;