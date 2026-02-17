class RealtimeVehiclePositionsProcessor {
	/**
	 * Registers the processor with feed timestamp and tripIdMap accessors.
	 * @param {Function} getFeedTimestamp - Async function to get feed timestamp.
	 * @param {Function} getFeedTripIdMap - Async function to get feed tripId map.
	 * @returns {Object} Object with updateResultsWithRealtime method.
	 */
	static async register(getFeedTimestamp, getFeedTripIdMap) {
		const processor = new RealtimeVehiclePositionsProcessor();
		const updateResultsWithRealtimeVehiclePositions = async payload => {
			const feedTimestamp = await getFeedTimestamp();
			const feedTripIdMap = await getFeedTripIdMap();
			if (feedTimestamp && feedTripIdMap) {
				try {
					payload.realtime_vehicle_positions_feed_timestamp = feedTimestamp;
					payload.response = await processor.processVehicleResponse(payload.response, feedTripIdMap);
				} catch (error) {
					this.logger.error('No realtime vehicle positions information available.', error);
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