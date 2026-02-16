/* eslint-env mocha */
// Mocha API
import { afterEach, beforeEach, describe, it } from 'mocha';
// Assertions module - chai
import { assert } from 'chai';
// Sinon for fakes, stubs, and spies
import { useFakeTimers } from 'sinon';

// The code under test
import utils from '../utils';

/**
 * Tests - Momentjs based functions:
 */
describe('Momentjs based functions:', () => {
	describe('getCurrentTimestamp', () => {
		const { getCurrentTimestamp } = utils;
		describe('when current time is: 13:43:30', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('should return the time as the number of seconds since midnight timestamp: 49410', async () => {
				const timestamp = getCurrentTimestamp();
				assert.equal(timestamp, 49410);
			});
		});

		describe('when current time is: 00:00:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 0, 0, 0));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('should return the time as the number of seconds since midnight timestamp: 0', async () => {
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

	describe('getUnixTimestamp', () => {
		const { getUnixTimestamp } = utils;

		describe('When the current time is 18:09:45', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 11, 22, 18, 9, 45)); // Months 0-11
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time as the Unix timestamp', async () => {
				const timestamp = getUnixTimestamp();
				assert.equal(timestamp, 1608660585);
			});
		});
	});

	describe('getCurrentTimestampPlusOneHour', () => {
		const { getCurrentTimestampPlusOneHour } = utils;
		describe('When current time is: 13:43:30', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time plus one hour 14:43:30 as a number of seconds since midnight timestamp: 53010', async () => {
				assert.equal(await getCurrentTimestampPlusOneHour(), 53010);
			});
		});

		describe('When current time is: 23:59:59', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 23, 59, 59));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the time plus one hour 00:59:59 as a number of seconds since midnight timestamp: 3599', async () => {
				assert.equal(await getCurrentTimestampPlusOneHour(), 3599);
			});
		});
	});

	describe('getTimestampMinusNumMinutes', () => {
		const { getTimestampMinusNumMinutes } = utils;
		describe('When provided timestamp is: 49410 (13:43:30)', () => {
			it('Should return the provided timestamp minus 25 minutes as a number of seconds since midnight timestamp: 47910', async () => {
				assert.equal(await getTimestampMinusNumMinutes(49410, 25), 47910);
			});
		});
	});

	describe('getCurrentDay', () => {
		const { getCurrentDay } = utils;
		describe('When current day is: Tuesday', async () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: tuesday', async () => {
				assert.equal(await getCurrentDay(), 'Tuesday');
			});
		});
	});

	describe('getCurrentDate', () => {
		const { getCurrentDate } = utils;
		describe('When current date is: 24th November 2020', async () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: 20201124', async () => {
				const currentDate = await getCurrentDate();
				assert.equal(currentDate, 20201124);
			});
		});
	});

	describe('getNextDay', () => {
		const { getNextDay } = utils;
		describe('When current day is Friday', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 27, 11, 27, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the following day: Saturday', async () => {
				const nextDay = await getNextDay();
				assert.equal(nextDay, 'Saturday');
			});
		});

		describe('When current day is Thursday on 31st Dec 2020', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 11, 31, 23, 0, 0));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the following day: Friday', async () => {
				const nextDay = await getNextDay();
				assert.equal(nextDay, 'Friday');
			});
		});
	});

	describe('getNextDayDate', () => {
		const { getNextDayDate } = utils;
		describe('When current date is Friday 27th November 2020', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 27, 11, 27, 30));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the following date: 20201128', async () => {
				const nextDayDate = getNextDayDate();
				assert.equal(nextDayDate, 20201128);
			});
		});

		describe('When current date is 31st December 2020', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 11, 31, 23, 0, 0));
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return the following date: 20210101', async () => {
				const nextDayDate = await getNextDayDate();
				assert.equal(nextDayDate, '20210101');
			});
		});
	});
});

/**
 * Tests - Wrapped time / Night Services functions:
 */
describe('Wrapped time / Night Services functions:', () => {
	describe('checkifNightServices', () => {
		const { getCurrentTimestamp, checkIfNightServices } = utils;
		describe('When current time is 01:15:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 1, 15, 0)); // 24 Nov 2020, 01:15:00
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: true', async () => {
				const timestamp = getCurrentTimestamp();
				assert.isTrue(await checkIfNightServices(timestamp));
			});
		});

		describe('When current time is 23:59:59', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 23, 59, 59)); // 23 Nov 2020, 23:50:00
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: false', async () => {
				const timestamp = getCurrentTimestamp();
				assert.isFalse(await checkIfNightServices(timestamp));
			});
		});

		describe('When current time is 00:00:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 0, 0, 0)); // 23 Nov 2020, 23:50:00
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: true', async () => {
				const timestamp = getCurrentTimestamp();
				assert.isTrue(await checkIfNightServices(timestamp));
			});
		});

		describe('When current time is 06:00:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 6, 0, 0)); // 23 Nov 2020, 06:00:00
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: false', async () => {
				const timestamp = getCurrentTimestamp();
				assert.isFalse(await checkIfNightServices(timestamp));
			});
		});

		describe('When current time is 05:59:59', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 5, 59, 59)); // 23 Nov 2020, 05:59:59
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return: true', async () => {
				const timestamp = getCurrentTimestamp();
				assert.isTrue(await checkIfNightServices(timestamp));
			});
		});
	});

	describe('getWrappedTimestamp', () => {
		const { getCurrentTimestamp, getWrappedTimestamp } = utils;
		describe('When provided timestamp is: 2715 (00:45:15)', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 0, 45, 15)); // 24 Nov 2020, 00:45:15
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return wrapped timestamp: 89115', async () => {
				const timestamp = getCurrentTimestamp();
				assert.equal(await getWrappedTimestamp(timestamp), 89115);
			});
		});

		describe('When provided timestamp is: 49410 (13:43:30)', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 24, 13, 43, 30)); // 24 Nov 2020, 13:43:30
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return wrapped timestamp: 49410', async () => {
				const timestamp = getCurrentTimestamp();
				assert.equal(await getWrappedTimestamp(timestamp), 49410);
			});
		});
	});

	describe('getWrappedDate', () => {
		const { getWrappedDate } = utils;
		describe('When current date is Friday 27th November 00:30:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 27, 0, 0, 30)); // 27 Nov 2020, 00:00:30
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return wrapped date Thursday 26th November as: 20201126', () => {
				const wrappedDate = getWrappedDate();
				assert.equal(wrappedDate, 20201126);
			});
		});
	});

	describe('getWrappedDay', () => {
		const { getWrappedDay } = utils;
		describe('When current date is Friday 27th November 00:30:00', () => {
			beforeEach(() => {
				this.clock = useFakeTimers(Date.UTC(2020, 10, 27, 0, 0, 30)); // 27 Nov 2020, 00:00:30
			});

			afterEach(() => {
				this.clock.restore();
			});

			it('Should return wrapped day Thursday', () => {
				const wrappedDay = getWrappedDay();
				assert.equal(wrappedDay, 'Thursday');
			});
		});
	});
});

/**
 * Tests - List of trips functions:
 */
describe('List of trips functions:', () => {
	const mocks = require('./mocks');
	describe('removeTripsAtLastStop', () => {
		const { removeTripsAtLastStop } = utils;
		describe('When I call removeTripsAtLastStop with a list of trips all with stop_sequence as the last stop and a corresponding list of the last stops of those trips', () => {
			it('Should return an empty list trips with all trips removed', async () => {
				const trips = await removeTripsAtLastStop(mocks.lastStopsMock1, mocks.tripsMockAllLastStops);
				assert.isEmpty(trips);
			});
		});

		describe('When I call removeTripsAtLastStop with a list of trips with no stop_sequence as the last stop', () => {
			it('Should return the list of trips with no trips removed', async () => {
				const trips = await removeTripsAtLastStop(mocks.lastStopsMock1, mocks.tripsMock1);
				assert.equal(trips.length, mocks.tripsMock1.length);
			});
		});

		describe('When I call removeTripsAtLastStop with a list of trips with some trips at last stop', () => {
			it('Should return a list of trips with only trips at last stop removed', async () => {
				const trips = await removeTripsAtLastStop(mocks.lastStopsMock1, mocks.tripsMock2);
				assert.equal(trips.length, 4);
			});
		});
	});
});
