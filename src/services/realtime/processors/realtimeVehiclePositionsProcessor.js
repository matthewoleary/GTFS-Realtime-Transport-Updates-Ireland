class RealtimeVehiclePositionsProcessor {
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
		const processor = new RealtimeVehiclePositionsProcessor(logger);
		const updateResultsWithRealtimeVehiclePositions = async payload => {
			const feedTimestamp = await getFeedTimestamp();
			const feedTripIdMap = await getFeedTripIdMap();
			if (feedTimestamp && feedTripIdMap) {
				try {
					payload.realtime_vehicle_positions_feed_timestamp = feedTimestamp;
					payload.response = await processor.processVehicleResponse(payload.response, feedTripIdMap);
				} catch (error) {
					processor.logger.error('No realtime vehicle positions information available.', error);
				}
			}
			return payload;
		};
		return {
			updateResultsWithRealtimeVehiclePositions
		};
	}

	/**
	* Processes a list or single vehicle/trip element, applying real-time vehicle position updates if available.
	*
	* For each element in the query response:
	*   - Looks up the corresponding GTFS-realtime feed entity using the element's trip_id.
	*   - If a matching feed entity with vehicle data exists, attaches the vehicle position to the element.
	*   - If no matching vehicle data exists, sets the element's vehicle property to null.
	*
	* @param {Array<Object>|Object} queryResponse - The query response object or a single element to update.
	* @param {Map<string, Object>} feedEntityMap - Map of trip_id to GTFS-realtime feed entity.
	* @returns {Promise<Array<Object>|Object>} The updated query response with vehicle positions applied.
	*/
	async processVehicleResponse(queryResponse, feedEntityMap) {
		if (Array.isArray(queryResponse)) {
			for (const element of queryResponse) {
				await this.getElementVehiclePositionIfExists(element, feedEntityMap);
			}
		} else if (queryResponse) {
			await this.getElementVehiclePositionIfExists(queryResponse, feedEntityMap);
		} else {
			this.logger.warn('Query response is empty, skipping vehicle positions processing.');
		}
		return queryResponse;
	}

	/**
	 * Attaches vehicle position information to a single element if available in the feed entity map.
	 *
	 * - If a feed entity exists for the element's trip_id, attaches its vehicle data without
	 *   the duplicate trip descriptor.
	 * - Otherwise, sets element.realtime_vehicle to null.
	 *
	 * @param {Object} element - The vehicle/trip element to update.
	 * @param {Map<string, Object>} feedEntityMap - Map of trip_id to GTFS-realtime feed entity.
	 * @returns {Promise<void>} Resolves when the element has been updated.
	 */
	async getElementVehiclePositionIfExists(element, feedEntityMap) {
		const vehicleEntity = feedEntityMap.get(element.trip_id);
		if (vehicleEntity && vehicleEntity.vehicle) {
			const { trip, ...vehicleWithoutTrip } = vehicleEntity.vehicle;
			element.realtime_vehicle = vehicleWithoutTrip;
		} else {
			element.realtime_vehicle = null;
		}
	}
}

export default RealtimeVehiclePositionsProcessor;
