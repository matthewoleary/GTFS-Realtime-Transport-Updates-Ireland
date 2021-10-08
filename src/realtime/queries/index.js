'use-strict';

const { sort } = require('shelljs');
const utils = require('../utils');

/* eslint-disable no-await-in-loop, max-depth */
const register = async getFeed => {
	const updateResultsWithRealtime = async query => {
		const feed = await getFeed();
		if (feed) {
			try {
				query.realtime_timestamp = feed.header.timestamp.low;
				const secondsSinceMidnightTimestamp = query.since_midnight_timestamp;

				// Maps over response for each stop, apples reduce function over each result for that stop
				query.response = await Promise.all(query.response.map(async function(stopResponse) {

					// Reduce over each result, fetch and apply trip delays if it exists
					// If after applying delay the trip has already arrived, it will not be included in filteredResponse
					let filteredResponse = await stopResponse.reduce(async function(filtered, element) {

						// Check if trip_id has a feed entity with matching id in the realtime feed
						// If feedEntity exists, set is_realtime property to true
						const feedEntity = feed.entity.find(object => object.id === element.trip_id);
						if (feedEntity) {
							if (element.scheduleRelationship !== 3) {
								element.is_realtime = true;
								if (feedEntity.tripUpdate.stopTimeUpdate) {
									const stopTimeUpdates = feedEntity.tripUpdate.stopTimeUpdate;
									element = await utils.findNearestStopDelay(element, stopTimeUpdates);
								}
							}
						} else {
							element.is_realtime = false;
						}

						const departureTimestamp = element.departure_timestamp;
						const arrivalTimestamp = element.arrival_timestamp;

						// If departure/arrival timestamp is before the time we made the query, set arrived to be true, arrived trips will be filtered out
						if (departureTimestamp) {
							if (departureTimestamp < secondsSinceMidnightTimestamp) {
								element.arrived = true;
							} else {
								element.due_in = await utils.getDueInValue(departureTimestamp, secondsSinceMidnightTimestamp);
							}
						} else if (arrivalTimestamp) {
							if (arrivalTimestamp < secondsSinceMidnightTimestamp) {
								element.arrived = true;
							} else {
								element.due_in = await utils.getDueInValue(arrivalTimestamp, secondsSinceMidnightTimestamp);
							}
						} else {
							console.log('Error, no departure or arrival timestamp available...');
						}

						// Convert any wrapped times and timestamps to normal times e.g convert 25:30:00 to 01:30:00
						if (departureTimestamp >= 86400) {
							const unWrappedTimestamp = await utils.getWrappedTimeStampUnwrapped(departureTimestamp);
							element.departure_timestamp = unWrappedTimestamp;
							element.departure_time = await utils.getTimestampAsTimeFormatted(unWrappedTimestamp);
						}

						if (arrivalTimestamp >= 86400) {
							const unWrappedTimestamp = await utils.getWrappedTimeStampUnwrapped(arrivalTimestamp);
							element.arrival_timestamp = arrivalTimestamp;
							element.arrival_time = await utils.getTimestampAsTimeFormatted(unWrappedTimestamp);
						}

						let syncFiltered = await filtered

						// Filter out any trips arriving before current timestamp i.e arrived == true
						if (!element.arrived) {
							syncFiltered.push(element)
						}
						return syncFiltered
					}, []);
					// Sort in order of earliest arrival_timestamp
					let sortedFilteredResponse = filteredResponse.sort((a, b) => (a.arrival_timestamp >= b.arrival_timestamp) ? 1 : -1);
					return sortedFilteredResponse
				}));
			} catch {
				console.log('No realtime feed available...');
			}
		}
		return query;
	};

	return {
		updateResultsWithRealtime
	};
};

module.exports = { register };