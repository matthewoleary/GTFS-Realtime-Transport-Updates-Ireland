// Mocha API
import { describe, it, beforeEach, afterEach } from 'mocha';
// Assertions module - chai
import { assert } from 'chai';
// Sinon for fakes, stubs, and spies
import { useFakeTimers } from 'sinon';

// The code under test
import utils from '../utils';
import { elementForNearestStopDelayMock, stopTimeUpdatesNearestStopDelayMocks, mockNearestStopDelayResponseFor151, stopTimeUpdatesNearestStopDelayMocks2, stopTimeUpdatesNearestStopDelayMocksNoUpdates, getMockRealtimeFeed } from './mocks';

/**
 * Tests - Realtime feed based functions:
 */
/* eslint-disable max-nested-callbacks */
describe('Realtime feed based functions', () => {
	describe('findNearestStopDelay', () => {
		const { findNearestStopDelay } = utils;
		const element = elementForNearestStopDelayMock;

		describe('Calling findNearestStopDelay for trip: 18.2.60-151-d12-1.90.I at stop: 8220DB000297 using mocks from call obtained at Unix time 1606738523', () => {
			const stopTimeUpdates = stopTimeUpdatesNearestStopDelayMocks.tripUpdate.stopTimeUpdate;
			describe('when nearest update has a delay of 360 seconds', () => {
				it('Should return element with updated departure and arrival timestamps = 45328, and departure and arrival time = 12:35:28', async () => {
					const nearestDelay = await findNearestStopDelay(element, stopTimeUpdates);
					const response = mockNearestStopDelayResponseFor151;
					assert.deepEqual(nearestDelay, response);
				});
			});
		});

		describe('Calling findNearestStopDelay for trip 18.2.60-151-d12-1.90.I at stop: 8220DB000297', () => {
			const stopTimeUpdates = stopTimeUpdatesNearestStopDelayMocks2.tripUpdate.stopTimeUpdate;
			describe('when nearest update has a delay of 0 seconds', () => {
				it('Should return element with departure and arrival timestamps unchanged = 44968, and departure and arrival time unchanged = 12:29:28', async () => {
					const nearestDelay = await findNearestStopDelay(element, stopTimeUpdates);
					const response = mockNearestStopDelayResponseFor151;
					assert.deepEqual(nearestDelay, response);
				});
			});
		});

		describe('Calling findNearestStopDelay for trip 18.2.60-151-d12-1.90.I at stop: 8220DB000297', () => {
			const stopTimeUpdates = stopTimeUpdatesNearestStopDelayMocksNoUpdates.tripUpdate.stopTimeUpdate;
			describe('when no updates on or before the current stop are in the list', () => {
				it('Should return element with departure and arrival timestamps unchanged = 44968, and departure and arrival time unchanged = 12:29:28', async () => {
					const nearestDelay = await findNearestStopDelay(element, stopTimeUpdates);
					const response = mockNearestStopDelayResponseFor151;
					assert.deepEqual(nearestDelay, response);
				});
			});
		});
	});

	describe('filterFeed', () => {
		const { filterFeed } = utils;

		describe('Calling filterFeed with feed captured at Unix time 1606738523', () => {
			it('Should return a feed with only entities with an id containing d12 or b12', async () => {
				await getMockRealtimeFeed(async (error, mockResponse) => {
					if (error) {
						assert.fail(null, null, 'Failed to read mock response');
					}

					const filteredFeed = await filterFeed(mockResponse);
					for (const feedEntity of filteredFeed.entity) {
						if (!(feedEntity.id.includes('b12')) || !(feedEntity.id.includes('d12'))) {
							assert.fail(0, 1, 'FeedEntity id contains b12 or d12');
						}
					}

					assert.isOk('everything', 'filteredFeed contains only entities with id containing d12 or b12');
				});
			});
		});
	});

	describe('getDueInValue', () => {
		const { getDueInValue } = utils;

		describe('Calling with arrivalTimestamp: 45328 and timestamp: 44139', () => {
			it('Should return the value: 20', async () => {
				const dueValue = await getDueInValue(45328, 44139);
				assert.equal(dueValue, 20);
			});
		});

		describe('Calling with arrivalTimestamp: 44139 and timestamp: 44139', () => {
			it('Should return the value: Due', async () => {
				const dueValue = await getDueInValue(44139, 44139);
				assert.equal(dueValue, 'Due');
			});
		});
	});

	describe('getTimestampAsTimeFormatted', () => {
		const { getTimestampAsTimeFormatted } = utils;

		describe('Calling with timestamp: 45328', () => {
			it('Should return the value: 12:35:28', async () => {
				const formattedTime = await getTimestampAsTimeFormatted(45328);
				assert.equal(formattedTime, '12:35:28');
			});
		});

		describe('Calling with timestamp: 0', () => {
			it('Should return the value: 00:00:00', async () => {
				const formattedTime = await getTimestampAsTimeFormatted(0);
				assert.equal(formattedTime, '00:00:00');
			});
		});
	});

	describe('getCurrentTimestamp', () => {
		const { getCurrentTimestamp } = utils;
		describe('When current time is: 13:43:30', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time as the number of seconds since midnight timestamp: 49410', async () => {
				const timestamp = getCurrentTimestamp();
				assert.equal(timestamp, 49410);
			});
		});

		describe('When current time is: 00:00:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 0, 0, 0));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time as the number of seconds since midnight timestamp: 0', async () => {
				const timestamp = getCurrentTimestamp();
				assert.equal(timestamp, 0);
			});
		});

		describe('When current time is: 13:43:30', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time as the number of seconds since midnight timestamp: 49410', async () => {
				const timestamp = getCurrentTimestamp();
				assert.equal(timestamp, 49410);
			});
		});
	});

	describe('getUnwrappedTimestamp', () => {
		const { getUnwrappedTimestamp } = utils;

		describe('When calling getUnwrappedTimestamp with timestamp 69912', () => {
			it('Should return the timestamp unchanged as 69912', async () => {
				assert.equal(69912, await getUnwrappedTimestamp(69912));
			});
		});

		describe('When calling getUnwrappedTimestamp with timestamp 0', () => {
			it('Should return the timestamp unchanged as 0', async () => {
				assert.equal(0, await getUnwrappedTimestamp(0));
			});
		});

		describe('When calling getUnwrappedTimestamp with timestamp 86400', () => {
			it('Should return the timestamp 0', async () => {
				assert.equal(0, await getUnwrappedTimestamp(86400));
			});
		});

		describe('When calling getUnwrappedTimestamp with timestamp 103800', () => {
			it('Should return the timestamp 17400', async () => {
				assert.equal(17400, await getUnwrappedTimestamp(103800));
			});
		});
	});

	describe('getCurrentTime', () => {
		const { getCurrentTime } = utils;
		describe('When current time is: 18:02:30', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 11, 22, 18, 2, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time formatted as 18:02:30', async () => {
				const currentTime = getCurrentTime();
				assert.equal(currentTime, '18:02:30');
			});
		});

		describe('When current time is: 00:00:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 11, 22, 0, 0, 0));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time formatted as 00:00:00', async () => {
				const currentTime = getCurrentTime();
				assert.equal(currentTime, '00:00:00');
			});
		});
	});
});
