import { readFile } from 'fs';
import { join } from 'path';

const getMockRealtimeFeed = async callback => {
	readFile(join(__dirname, 'GTFSR-Output-12.json'), 'utf8', (err, data) => {
		callback(null, JSON.parse(data));
	});
};

const elementForNearestStopDelayMock = {
	trip_id: '18.2.60-151-d12-1.90.I',
	trip_index: 26611,
	trip_headsign: 'Foxborough Estate - Bargy Road',
	route_id: '60-151-d12-1',
	stop_id: '8220DB000297',
	stop_headsign: ' Docklands',
	service_id: '2#1',
	direction_id: 1,
	arrival_time: '12:29:28',
	arrival_timestamp: 44968,
	departure_time: '12:29:28',
	departure_timestamp: 44968,
	stop_sequence: 43,
	shape_id: '60-151-d12-1.90.I',
	shape_dist_traveled: 16848.0703125,
	last_stop: false,
	isRealtime: true
};

const stopTimeUpdatesNearestStopDelayMocks = {
	id: '18.2.60-151-d12-1.90.I',
	tripUpdate: {
		trip: {
			tripId: '18.2.60-151-d12-1.90.I',
			startTime: '11:40:00',
			startDate: '20201130',
			scheduleRelationship: 'SCHEDULED',
			routeId: '60-151-d12-1'
		},
		stopTimeUpdate: [
			{
				stopSequence: 1,
				departure: {
					delay: 0
				},
				stopId: '8230DB004606',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 21,
				arrival: {
					delay: 300
				},
				departure: {
					delay: 300
				},
				stopId: '8220DB006142',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 23,
				arrival: {
					delay: 360
				},
				departure: {
					delay: 360
				},
				stopId: '8220DB002182',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 26,
				arrival: {
					delay: 300
				},
				departure: {
					delay: 300
				},
				stopId: '8220DB007043',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 29,
				arrival: {
					delay: 360
				},
				departure: {
					delay: 360
				},
				stopId: '8220DB002187',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 30,
				arrival: {
					delay: 300
				},
				departure: {
					delay: 300
				},
				stopId: '8220DB002188',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 34,
				arrival: {
					delay: 360
				},
				departure: {
					delay: 360
				},
				stopId: '8220DB002190',
				scheduleRelationship: 'SCHEDULED'
			}
		]
	}
};

const stopTimeUpdatesNearestStopDelayMocks2 = {
	id: '18.2.60-151-d12-1.90.I',
	tripUpdate: {
		trip: {
			tripId: '18.2.60-151-d12-1.90.I',
			startTime: '11:40:00',
			startDate: '20201130',
			scheduleRelationship: 'SCHEDULED',
			routeId: '60-151-d12-1'
		},
		stopTimeUpdate: [
			{
				stopSequence: 1,
				departure: {
					delay: 0
				},
				stopId: '8230DB004606',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 21,
				arrival: {
					delay: 300
				},
				departure: {
					delay: 300
				},
				stopId: '8220DB006142',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 23,
				arrival: {
					delay: 360
				},
				departure: {
					delay: 360
				},
				stopId: '8220DB002182',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 26,
				arrival: {
					delay: 300
				},
				departure: {
					delay: 300
				},
				stopId: '8220DB007043',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 29,
				arrival: {
					delay: 360
				},
				departure: {
					delay: 360
				},
				stopId: '8220DB002187',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 30,
				arrival: {
					delay: 300
				},
				departure: {
					delay: 300
				},
				stopId: '8220DB002188',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 34,
				stopId: '8220DB002190',
				scheduleRelationship: 'SCHEDULED'
			}
		]
	}
};

const stopTimeUpdatesNearestStopDelayMocksNoUpdates = {
	id: '18.2.60-151-d12-1.90.I',
	tripUpdate: {
		trip: {
			tripId: '18.2.60-151-d12-1.90.I',
			startTime: '11:40:00',
			startDate: '20201130',
			scheduleRelationship: 'SCHEDULED',
			routeId: '60-151-d12-1'
		},
		stopTimeUpdate: [
			{
				stopSequence: 44,
				departure: {
					delay: 0
				},
				stopId: '8230DB004606',
				scheduleRelationship: 'SCHEDULED'
			},
			{
				stopSequence: 45,
				arrival: {
					delay: 360
				},
				departure: {
					delay: 360
				},
				stopId: '8220DB002190',
				scheduleRelationship: 'SCHEDULED'
			}
		]
	}
};

const mockNearestStopDelayResponseFor151 = {
	trip_id: '18.2.60-151-d12-1.90.I',
	trip_index: 26611,
	trip_headsign: 'Foxborough Estate - Bargy Road',
	route_id: '60-151-d12-1',
	stop_id: '8220DB000297',
	stop_headsign: ' Docklands',
	service_id: '2#1',
	direction_id: 1,
	arrival_time: '12:35:28',
	arrival_timestamp: 45328,
	departure_time: '12:35:28',
	departure_timestamp: 45328,
	stop_sequence: 43,
	shape_id: '60-151-d12-1.90.I',
	shape_dist_traveled: 16848.0703125,
	last_stop: false,
	isRealtime: true
};

export default { getMockRealtimeFeed, elementForNearestStopDelayMock, stopTimeUpdatesNearestStopDelayMocks, stopTimeUpdatesNearestStopDelayMocks2, stopTimeUpdatesNearestStopDelayMocksNoUpdates, mockNearestStopDelayResponseFor151 };
