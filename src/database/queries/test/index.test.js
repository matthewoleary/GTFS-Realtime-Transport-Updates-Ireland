/* eslint-env mocha */
// Mocha API
import { describe, it, before, after } from 'mocha';
// Assertions module - chai
import { assert } from 'chai';

// MSSQL config for accessing database
import { mockConfig } from '../../test/mocks';

// The code under test
import dataClient from '../..';
import { expectedStopByIdResponseMock, expectedRouteByIdResponseMock, expectedAgencyByIdResponseMock, getJsonResponseMock, expectedTripByIdResponseMock, expectedLastStopsResponseMock, expectedTransfersFromStopIdResponseMock, expectedTransfersToStopIdResponseMock } from './response-mocks';
import { expectedTripsAtStopIdResponseMockSunday, expectedTripsAtStopIdResponseMockMonday, expectedTripsAtStopIdResponseMockTuesday, expectedTripsAtStopIdResponseMockWednesday, expectedTripsAtStopIdResponseMockThursday, expectedTripsAtStopIdResponseMockFriday, expectedTripsAtStopIdResponseMockSaturday } from './trips-at-stopid-mocks';
import { expectedNightTripsAtStopIdResponseMockMonday, expectedNightTripsAtStopIdResponseMockSunday, expectedNightTripsAtStopIdResponseMockMonday2, expectedNightTripsAtStopIdResponseMockTuesday, expectedNightTripsAtStopIdResponseMockTuesday2, expectedNightTripsAtStopIdResponseMockWednesday, expectedNightTripsAtStopIdResponseMockWednesday2, expectedNightTripsAtStopIdResponseMockThursday, expectedNightTripsAtStopIdResponseMockThursday2, expectedNightTripsAtStopIdResponseMockFriday, expectedNightTripsAtStopIdResponseMockFriday2, expectedNightTripsAtStopIdResponseMockSaturday, expectedNightTripsAtStopIdResponseMockSaturday2, expectedNightTripsAtStopIdResponseMockSunday2 } from './night-trips-at-stopid-mocks';

/**
 * Tests - SQL Queries
 */
/* eslint-disable max-nested-callbacks */
describe('SQL Query Tests: ', () => {
	describe('getStopById', () => {
		describe('When I call getStopById with stop_id 8220DB000220', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting data from the row with stop_id 8220DB000220 in the stops table in the database', async () => {
				const response = await client.queries.getStopById('8220DB000220');
				assert.deepEqual(response.recordset, expectedStopByIdResponseMock);
				assert.notEqual(response.recordset, {});
			});
		});
	});

	describe('getRouteById', () => {
		describe('When I call getRouteById with route_id 60-38-b12-1', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting data from the row with route_id 60-38-b12-1 in the routes table in the database', async () => {
				const response = await client.queries.getRouteById('60-38-b12-1');
				assert.deepEqual(response.recordset, expectedRouteByIdResponseMock);
				assert.notEqual(response.recordset, {});
			});
		});
	});

	describe('getAgencyById', () => {
		describe('When I call getAgencyById with agency_id 978', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting data from the row with agency_id 978 in the agency table in the database', async () => {
				const response = await client.queries.getAgencyById('978');
				assert.deepEqual(response.recordset, expectedAgencyByIdResponseMock);
				assert.notEqual(response.recordset, {});
			});
		});
	});

	describe('getShapeById', () => {
		describe('When I call getShapeById with shape_id 60-116-b12-1.54.O', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting data from the row with shape_id 60-116-b12-1.54.O in the shapes table in the database', async () => {
				const response = await client.queries.getShapeById('60-116-b12-1.54.O');
				const filename = 'shapes-mock.json';
				await getJsonResponseMock(filename, (err, mockResponse) => {
					if (err) {
						assert.fail(null, null, 'Failed to read mock response');
					}

					assert.deepEqual(response.recordset, mockResponse);
				});
			});
		});
	});

	describe('getTripById', () => {
		describe('When I call getTripById with trip_id 10559.2.60-14-b12-1.122.I', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting data from the row with trip_id 10559.2.60-14-b12-1.122.I in the trips table in the database', async () => {
				const response = await client.queries.getTripById('10559.2.60-14-b12-1.122.I');
				assert.deepEqual(response.recordset, expectedTripByIdResponseMock);
				assert.notEqual(response.recordset, {});
			});
		});
	});

	describe('getLastStops', () => {
		describe('When I call getLastStops with a list of trips', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			const trips = expectedTripsAtStopIdResponseMockSunday;

			it('should return a response object containing the last stop on each trip in the list', async () => {
				const response = await client.queries.getLastStops(trips);
				assert.deepEqual(response, expectedLastStopsResponseMock);
				assert.notEqual(response, {});
			});
		});

		describe('When I call getLastStops with an empty list of trips', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			const trips = null;

			it('should return an empty results list', async () => {
				const response = await client.queries.getLastStops(trips);
				assert.deepEqual(response, []);
			});
		});
	});

	describe('getTripsAtStopId', () => {
		describe('Monday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220DB000148, scheduleDate 20210104, scheduleDay monday, currentTimestampMinusNumMinutes 44445, currentTimestampPlusOneHour 48645', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000148',
					scheduleDate: 20210104,
					scheduleDay: 'monday',
					currentTimestampMinusNumMinutes: 44445,
					currentTimestampPlusOneHour: 48645
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000148 between 12:20:45 and 13:30:45 on 04/01/2021', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockMonday);
					assert.notEqual(response.recordset, {});
				});
			});
		});

		describe('Tuesday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220B136041, scheduleDate 20201229, scheduleDay tuesday, currentTimestampMinusNumMinutes 25225, currentTimestampPlusOneHour 29425', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220B136041',
					scheduleDate: 20201229,
					scheduleDay: 'tuesday',
					currentTimestampMinusNumMinutes: 25225,
					currentTimestampPlusOneHour: 29425
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220B136041 between 07:00:20 and 08:10:20 on 04/01/2021', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockTuesday);
					assert.notEqual(response.recordset, {});
				});
			});
		});

		describe('Wednesday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220DB000297, scheduleDate 20201230, scheduleDay wednesday, currentTimestampMinusNumMinutes 82199, currentTimestampPlusOneHour 86399', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000297',
					scheduleDate: 20201230,
					scheduleDay: 'wednesday',
					currentTimestampMinusNumMinutes: 82199,
					currentTimestampPlusOneHour: 86399
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000297 between 22:49:59 and 23:59:59 on 30/12/2020', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockWednesday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('Thursday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220DB000297, scheduleDate 20201217, scheduleDay thursday, currentTimestampMinusNumMinutes 67385, currentTimestampPlusOneHour 71585', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000297',
					scheduleDate: 20201217,
					scheduleDay: 'thursday',
					currentTimestampMinusNumMinutes: 67385,
					currentTimestampPlusOneHour: 71585
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000297 between ', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockThursday);
					assert.notEqual(response.recordset, {});
				});
			});
		});

		describe('Friday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220DB000297, scheduleDate 20210101, scheduleDay friday, currentTimestampMinusNumMinutes 64200, currentTimestampPlusOneHour 68400', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000297',
					scheduleDate: 20210101,
					scheduleDay: 'friday',
					currentTimestampMinusNumMinutes: 64200,
					currentTimestampPlusOneHour: 68400
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000297 between 17:50:50 and 19:00:00 on 01/01/2021', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockFriday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('Saturday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220DB000297, scheduleDate 20201219, scheduleDay saturday, currentTimestampMinusNumMinutes 67385, currentTimestampPlusOneHour 71585', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000297',
					scheduleDate: 20201219,
					scheduleDay: 'saturday',
					currentTimestampMinusNumMinutes: 67385,
					currentTimestampPlusOneHour: 71585
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000297', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockSaturday);
					assert.notEqual(response.recordset, {});
				});
			});
		});

		describe('Sunday', () => {
			describe('When I call getTripsAtStopId with stop_id 8220DB000297, scheduleDate 20210110, scheduleDay sunday, currentTimestampMinusNumMinutes 64200, currentTimestampPlusOneHour 68400', () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000297',
					scheduleDate: 20210110,
					scheduleDay: 'sunday',
					currentTimestampMinusNumMinutes: 64200,
					currentTimestampPlusOneHour: 68400
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000297 between 17:50:50 and 19:00:00 on 10/01/2021', async () => {
					const response = await client.queries.getTripsAtStopId(params);
					assert.deepEqual(response.recordset, expectedTripsAtStopIdResponseMockFriday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});
	});

	describe('getTripsAtStopIdNightServices', () => {
		describe('mondayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on monday schedule 21/12/2020 at 23:30:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201221,
					nextDayDate: 20201222,
					scheduleDay: 'monday',
					wrappedCurrentTimestampMinusNumMinutes: 84000,
					wrappedCurrentTimestampPlusOneHour: 88200,
					currentTimestampPlusOneHour: 1800
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:20:00 and 24:30:00 on the schedule day 21/12/2020 and up to 00:30:00 on schedule day 22/12/2020', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockMonday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockSunday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on monday schedule 21/12/2020 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201221,
					nextDayDate: 20201222,
					scheduleDay: 'monday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 21/12/2020 and up to 06:00:00 on schedule day 22/12/2020', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockMonday2);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockSunday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('tuesdayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on tuesday schedule 29/12/2020 at 23:45:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201229,
					nextDayDate: 20201230,
					scheduleDay: 'tuesday',
					wrappedCurrentTimestampMinusNumMinutes: 84900,
					wrappedCurrentTimestampPlusOneHour: 88500,
					currentTimestampPlusOneHour: 2100
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:35:00 and 24:45:00 on the schedule day 29/12/2020 and up to 00:30:00 on schedule day 30/12/2020', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockTuesday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockMonday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on tuesday schedule 29/12/2020 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201229,
					nextDayDate: 20201230,
					scheduleDay: 'tuesday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 29/12/2020 and up to 06:00:00 on schedule day 30/12/2020', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockTuesday2);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('wednesdayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on wednesday schedule 30/12/2020 at 23:59:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201230,
					nextDayDate: 20201231,
					scheduleDay: 'wednesday',
					wrappedCurrentTimestampMinusNumMinutes: 85750,
					wrappedCurrentTimestampPlusOneHour: 89940,
					currentTimestampPlusOneHour: 3540
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:49:00 and 24:59:00 on the schedule day 30/12/2020 and up to 00:30:00 on schedule day 31/12/2020', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockWednesday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockMonday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on wednesday schedule 30/12/2020 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201230,
					nextDayDate: 20201231,
					scheduleDay: 'wednesday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 30/12/2020 and up to 06:00:00 on schedule day 31/12/2020', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockWednesday2);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('thursdayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on tuesday schedule 31/12/2020 at 23:59:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201231,
					nextDayDate: 20210101,
					scheduleDay: 'thursday',
					wrappedCurrentTimestampMinusNumMinutes: 85750,
					wrappedCurrentTimestampPlusOneHour: 89940,
					currentTimestampPlusOneHour: 3540
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:49:00 and 24:59:00 on the schedule day 31/12/2020 and up to 00:30:00 on schedule day 01/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockThursday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockWednesday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on thursday schedule 31/12/2020 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20201231,
					nextDayDate: 20210101,
					scheduleDay: 'thursday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 31/12/2020 and up to 06:00:00 on schedule day 01/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockThursday2);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('fridayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on friday schedule 01/01/2021 at 23:59:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20210101,
					nextDayDate: 20210102,
					scheduleDay: 'friday',
					wrappedCurrentTimestampMinusNumMinutes: 85750,
					wrappedCurrentTimestampPlusOneHour: 89940,
					currentTimestampPlusOneHour: 3540
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:49:00 and 24:59:00 on the schedule day 01/01/2021 and up to 00:30:00 on schedule day 02/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockFriday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockThursday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on thursday schedule 01/01/2021 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20210101,
					nextDayDate: 20210102,
					scheduleDay: 'friday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 01/01/2021 and up to 06:00:00 on schedule day 02/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockFriday2);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('saturdayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on saturday schedule 02/01/2021 at 23:59:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20210102,
					nextDayDate: 20210103,
					scheduleDay: 'saturday',
					wrappedCurrentTimestampMinusNumMinutes: 85750,
					wrappedCurrentTimestampPlusOneHour: 89940,
					currentTimestampPlusOneHour: 3540
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:49:00 and 24:59:00 on the schedule day 02/01/2021 and up to 00:30:00 on schedule day 03/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockSaturday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockFriday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on saturday schedule 02/01/2021 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20210102,
					nextDayDate: 20210103,
					scheduleDay: 'saturday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 02/01/2021 and up to 06:00:00 on schedule day 03/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockSaturday2);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});

		describe('sundayNight', () => {
			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on sunday schedule 03/01/2021 at 23:59:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20210103,
					nextDayDate: 20210104,
					scheduleDay: 'sunday',
					wrappedCurrentTimestampMinusNumMinutes: 85750,
					wrappedCurrentTimestampPlusOneHour: 89940,
					currentTimestampPlusOneHour: 3540
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 23:49:00 and 24:59:00 on the schedule day 03/01/2021 and up to 00:30:00 on schedule day 04/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockSunday);
					assert.notEqual(response.recordset, expectedNightTripsAtStopIdResponseMockFriday);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});

			describe('When I call getTripsAtStopIdWithNightServices with stop id 8220DB000288 on sunday schedule 03/01/2021 at 29:00:00', async () => {
				let client;

				before(async () => {
					client = await dataClient('', mockConfig);
				});

				after(async () => {
					await client.closePool();
				});

				const params = {
					stopId: '8220DB000288',
					scheduleDate: 20210103,
					nextDayDate: 20210104,
					scheduleDay: 'sunday',
					wrappedCurrentTimestampMinusNumMinutes: 103800,
					wrappedCurrentTimestampPlusOneHour: 108000,
					currentTimestampPlusOneHour: 21600
				};

				it('should return a response object containting a list of the scheduled trips arriving at stop_id 8220DB000288 between 28:50:00 and 30:00:00 on the schedule day 03/01/2021 and up to 06:00:00 on schedule day 04/01/2021', async () => {
					const response = await client.queries.getTripsAtStopIdWithNightServices(params);
					assert.deepEqual(response.recordset, expectedNightTripsAtStopIdResponseMockSunday2);
					assert.notEqual(response.recordset, {});
				}).timeout(5000);
			});
		});
	});

	describe('getTransfersFromStopId', () => {
		describe('When I call getTransfersFromStopId with stop_id 8220DB000297', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting transfers from the stop_id 8220DB000220 in the transfers table', async () => {
				const response = await client.queries.getTransfersFromStopId('8220DB000220');
				assert.deepEqual(response.recordset, expectedTransfersFromStopIdResponseMock);
				assert.notEqual(response.recordset, {});
			});
		});
	});

	describe('getTransfersToStopId', () => {
		describe('When I call getTransfersToStopId with stop_id 8220DB000297', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting transfers to the stop_id 8220DB000220 in the transfers table', async () => {
				const response = await client.queries.getTransfersToStopId('8220DB000220');
				assert.deepEqual(response.recordset, expectedTransfersToStopIdResponseMock);
				assert.notEqual(response.recordset, {});
			});
		});
	});

	describe('getStopTimesByTripId', () => {
		describe('When I call getStopTimesByTripId with trip_id 10559.2.60-14-b12-1.122.I', () => {
			let client;

			before(async () => {
				client = await dataClient('', mockConfig);
			});

			after(async () => {
				await client.closePool();
			});

			it('should return a response object containting transfers to the trip_id 10559.2.60-14-b12-1.122.I in the transfers table', async () => {
				const response = await client.queries.getStopTimesByTripId('10559.2.60-14-b12-1.122.I');
				const filename = 'stoptimes-mock.json';
				await getJsonResponseMock(filename, (err, mockResponse) => {
					if (err) {
						assert.fail(null, null, 'Failed to read mock response');
					}

					assert.deepEqual(response, mockResponse);
				});
			}).timeout(10000);
		});
	});
});
