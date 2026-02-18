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
					if (Array.isArray(payload.response)) {
						payload.response = await processor.processVehicleResponse(payload.response, feedTripIdMap);
					} else {
						processor.logger.warn('Payload response is not an array, skipping vehicle positions processing.', payload.response);
					}
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
	 * Processes a list of vehicle/trip elements, applying real-time updates if available.
	 *
	 * For each element:
	 *   - Looks up the corresponding GTFS-realtime feed entity to the entity in the query response.
	 *   - Applies the vehicle position information to the entity in the query response.
	 *
	 * @param {Array<Object>} queryResponse - The query response object.
	 * @param {Map<string, Object>} feedEntityMap - Map of trip_id to GTFS-realtime feed entity.
	 * @returns {Promise<Array<Object>>} Array of updated vehicle/trip elements.
	 */
	async processVehicleResponse(queryResponse, feedEntityMap) {
		for (const element of queryResponse) {
			const vehicleEntity = feedEntityMap.get(element.trip_id);
			if (vehicleEntity && vehicleEntity.vehicle) {
				element.vehicle = vehicleEntity.vehicle;
			} else {
				element.vehicle = null;
			}
		}
		return queryResponse;
	}
}

export default RealtimeVehiclePositionsProcessor;