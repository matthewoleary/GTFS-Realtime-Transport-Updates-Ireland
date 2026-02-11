'use-strict';

import { readFile } from 'fs';
import { join } from 'path';

const expectedStopByIdResponseMock = [
	{
		stop_id: '8220DB000220',
		stop_index: 292,
		stop_name: 'Whitehall, Swords Road',
		stop_lat: 53.387939453125,
		stop_lon: -6.244980812072754
	}
];

const expectedRouteByIdResponseMock = [
	{
		route_id: '60-38-b12-1',
		route_index: 349,
		agency_id: '978',
		route_short_name: '38',
		route_long_name: 'Burlington Road (Mespil Road) - Damastown Drive',
		route_type: 3
	}
];

const expectedAgencyByIdResponseMock = [
	{
		agency_id: '978',
		agency_name: 'Dublin Bus',
		agency_url: 'https://www.transportforireland.ie',
		agency_timezone: 'Europe/Dublin',
		agency_lang: 'EN'
	}
];

const expectedTripByIdResponseMock = [
	{
		trip_id: '10559.2.60-14-b12-1.122.I',
		trip_index: 1324,
		route_id: '60-14-b12-1',
		service_id: '2#1',
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		direction_id: 1,
		shape_id: '60-14-b12-1.122.I'
	}
];

const expectedLastStopsResponseMock = [
	{
		recordsets: [
			[
				{
					trip_id: '15246.1.60-14-b12-1.122.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '15246.1.60-14-b12-1.122.I',
				stop_id: '8220DB000248',
				stop_sequence: 77
			}
		],
		output: {},
		rowsAffected: [1]
	},
	{
		recordsets: [
			[
				{
					trip_id: '12404.1.60-151-b12-1.86.I',
					stop_id: '8220DB002278',
					stop_sequence: 51
				}
			]
		],
		recordset: [
			{
				trip_id: '12404.1.60-151-b12-1.86.I',
				stop_id: '8220DB002278',
				stop_sequence: 51
			}
		],
		output: {},
		rowsAffected: [1]
	},
	{
		recordsets: [
			[
				{
					trip_id: '15261.1.60-14-b12-1.122.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '15261.1.60-14-b12-1.122.I',
				stop_id: '8220DB000248',
				stop_sequence: 77
			}
		],
		output: {},
		rowsAffected: [1]
	},
	{
		recordsets: [
			[
				{
					trip_id: '12419.1.60-151-b12-1.86.I',
					stop_id: '8220DB002278',
					stop_sequence: 51
				}
			]
		],
		recordset: [
			{
				trip_id: '12419.1.60-151-b12-1.86.I',
				stop_id: '8220DB002278',
				stop_sequence: 51
			}
		],
		output: {},
		rowsAffected: [1]
	},
	{
		recordsets: [
			[
				{
					trip_id: '15296.1.60-14-b12-1.122.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '15296.1.60-14-b12-1.122.I',
				stop_id: '8220DB000248',
				stop_sequence: 77
			}
		],
		output: {},
		rowsAffected: [1]
	},
	{
		recordsets: [
			[
				{
					trip_id: '15277.1.60-14-b12-1.122.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '15277.1.60-14-b12-1.122.I',
				stop_id: '8220DB000248',
				stop_sequence: 77
			}
		],
		output: {},
		rowsAffected: [1]
	}
];

const expectedTransfersFromStopIdResponseMock = [
	{
		from_stop_id: '8220DB000220',
		to_stop_id: '8220DB000210',
		transfer_type: 2,
		min_transfer_time: 150
	},
	{
		from_stop_id: '8220DB000220',
		to_stop_id: '8220DB000209',
		transfer_type: 2,
		min_transfer_time: 120
	},
	{
		from_stop_id: '8220DB000220',
		to_stop_id: '8220DB001641',
		transfer_type: 2,
		min_transfer_time: 0
	},
	{
		from_stop_id: '8220DB000220',
		to_stop_id: '8240DB001640',
		transfer_type: 2,
		min_transfer_time: 654
	}
];

const expectedTransfersToStopIdResponseMock = [
	{
		from_stop_id: '8220DB001641',
		to_stop_id: '8220DB000220',
		transfer_type: 2,
		min_transfer_time: 0
	},
	{
		from_stop_id: '8240DB001640',
		to_stop_id: '8220DB000220',
		transfer_type: 2,
		min_transfer_time: 654
	},
	{
		from_stop_id: '8220DB000210',
		to_stop_id: '8220DB000220',
		transfer_type: 2,
		min_transfer_time: 150
	},
	{
		from_stop_id: '8220DB000209',
		to_stop_id: '8220DB000220',
		transfer_type: 2,
		min_transfer_time: 120
	}
];

const getJsonResponseMock = async (filename, callback) => {
	readFile(join(__dirname, filename), (err, data) => {
		callback(null, JSON.parse(data));
	});
};

export default {
	expectedAgencyByIdResponseMock,
	expectedLastStopsResponseMock,
	expectedRouteByIdResponseMock,
	expectedStopByIdResponseMock,
	expectedTransfersFromStopIdResponseMock,
	expectedTransfersToStopIdResponseMock,
	expectedTripByIdResponseMock,
	getJsonResponseMock
};
