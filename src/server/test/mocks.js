'use-strict';

const tripsMock1 = [
	{
		trip_id: '5651.2.60-14-b12-1.126.I',
		trip_index: 5449,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:03:22',
		arrival_timestamp: 50602,
		departure_time: '14:03:22',
		departure_timestamp: 50602,
		stop_sequence: 49,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '85.2.60-151-b12-1.90.I',
		trip_index: 6718,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:09:32',
		arrival_timestamp: 50972,
		departure_time: '14:09:32',
		departure_timestamp: 50972,
		stop_sequence: 43,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	},
	{
		trip_id: '5560.2.60-14-b12-1.126.I',
		trip_index: 5380,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:18:22',
		arrival_timestamp: 51502,
		departure_time: '14:18:22',
		departure_timestamp: 51502,
		stop_sequence: 49,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '63.2.60-151-b12-1.90.I',
		trip_index: 6516,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:29:32',
		arrival_timestamp: 52172,
		departure_time: '14:29:32',
		departure_timestamp: 52172,
		stop_sequence: 43,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	},
	{
		trip_id: '5572.2.60-14-b12-1.126.I',
		trip_index: 5368,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:33:22',
		arrival_timestamp: 52402,
		departure_time: '14:33:22',
		departure_timestamp: 52402,
		stop_sequence: 49,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '5607.2.60-14-b12-1.126.I',
		trip_index: 5493,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:48:22',
		arrival_timestamp: 53302,
		departure_time: '14:48:22',
		departure_timestamp: 53302,
		stop_sequence: 49,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '9.2.60-151-b12-1.90.I',
		trip_index: 6713,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:49:32',
		arrival_timestamp: 53372,
		departure_time: '14:49:32',
		departure_timestamp: 53372,
		stop_sequence: 43,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	}
];

const lastStopsMock1 = [
	{
		recordsets: [
			[
				{
					trip_id: '5651.2.60-14-b12-1.126.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '5651.2.60-14-b12-1.126.I',
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
					trip_id: '85.2.60-151-b12-1.90.I',
					stop_id: '8220DB002278',
					stop_sequence: 51
				}
			]
		],
		recordset: [
			{
				trip_id: '85.2.60-151-b12-1.90.I',
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
					trip_id: '5560.2.60-14-b12-1.126.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '5560.2.60-14-b12-1.126.I',
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
					trip_id: '63.2.60-151-b12-1.90.I',
					stop_id: '8220DB002278',
					stop_sequence: 51
				}
			]
		],
		recordset: [
			{
				trip_id: '63.2.60-151-b12-1.90.I',
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
					trip_id: '5572.2.60-14-b12-1.126.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '5572.2.60-14-b12-1.126.I',
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
					trip_id: '5607.2.60-14-b12-1.126.I',
					stop_id: '8220DB000248',
					stop_sequence: 77
				}
			]
		],
		recordset: [
			{
				trip_id: '5607.2.60-14-b12-1.126.I',
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
					trip_id: '9.2.60-151-b12-1.90.I',
					stop_id: '8220DB002278',
					stop_sequence: 51
				}
			]
		],
		recordset: [
			{
				trip_id: '9.2.60-151-b12-1.90.I',
				stop_id: '8220DB002278',
				stop_sequence: 51
			}
		],
		output: {},
		rowsAffected: [1]
	}
];

const tripsMockAllLastStops = [
	{
		trip_id: '5651.2.60-14-b12-1.126.I',
		trip_index: 5449,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:03:22',
		arrival_timestamp: 50602,
		departure_time: '14:03:22',
		departure_timestamp: 50602,
		stop_sequence: 77,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '85.2.60-151-b12-1.90.I',
		trip_index: 6718,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:09:32',
		arrival_timestamp: 50972,
		departure_time: '14:09:32',
		departure_timestamp: 50972,
		stop_sequence: 51,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	},
	{
		trip_id: '5560.2.60-14-b12-1.126.I',
		trip_index: 5380,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:18:22',
		arrival_timestamp: 51502,
		departure_time: '14:18:22',
		departure_timestamp: 51502,
		stop_sequence: 77,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '63.2.60-151-b12-1.90.I',
		trip_index: 6516,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:29:32',
		arrival_timestamp: 52172,
		departure_time: '14:29:32',
		departure_timestamp: 52172,
		stop_sequence: 51,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	},
	{
		trip_id: '5572.2.60-14-b12-1.126.I',
		trip_index: 5368,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:33:22',
		arrival_timestamp: 52402,
		departure_time: '14:33:22',
		departure_timestamp: 52402,
		stop_sequence: 77,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '5607.2.60-14-b12-1.126.I',
		trip_index: 5493,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:48:22',
		arrival_timestamp: 53302,
		departure_time: '14:48:22',
		departure_timestamp: 53302,
		stop_sequence: 77,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '9.2.60-151-b12-1.90.I',
		trip_index: 6713,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:49:32',
		arrival_timestamp: 53372,
		departure_time: '14:49:32',
		departure_timestamp: 53372,
		stop_sequence: 51,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	}
];

const tripsMock2 = [
	{
		trip_id: '5651.2.60-14-b12-1.126.I',
		trip_index: 5449,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:03:22',
		arrival_timestamp: 50602,
		departure_time: '14:03:22',
		departure_timestamp: 50602,
		stop_sequence: 49,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '85.2.60-151-b12-1.90.I',
		trip_index: 6718,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:09:32',
		arrival_timestamp: 50972,
		departure_time: '14:09:32',
		departure_timestamp: 50972,
		stop_sequence: 51,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	},
	{
		trip_id: '5560.2.60-14-b12-1.126.I',
		trip_index: 5380,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:18:22',
		arrival_timestamp: 51502,
		departure_time: '14:18:22',
		departure_timestamp: 51502,
		stop_sequence: 77,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '63.2.60-151-b12-1.90.I',
		trip_index: 6516,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:29:32',
		arrival_timestamp: 52172,
		departure_time: '14:29:32',
		departure_timestamp: 52172,
		stop_sequence: 43,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	},
	{
		trip_id: '5572.2.60-14-b12-1.126.I',
		trip_index: 5368,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:33:22',
		arrival_timestamp: 52402,
		departure_time: '14:33:22',
		departure_timestamp: 52402,
		stop_sequence: 77,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '5607.2.60-14-b12-1.126.I',
		trip_index: 5493,
		trip_headsign: 'Outside Luas Station - Maryfield Drive',
		route_id: '60-14-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Beaumont',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:48:22',
		arrival_timestamp: 53302,
		departure_time: '14:48:22',
		departure_timestamp: 53302,
		stop_sequence: 1,
		shape_id: '60-14-b12-1.126.I',
		shape_dist_traveled: 14434.77
	},
	{
		trip_id: '9.2.60-151-b12-1.90.I',
		trip_index: 6713,
		trip_headsign: 'Foxborough Estate - Bargy Road',
		route_id: '60-151-b12-1',
		stop_id: '8220DB000297',
		stop_headsign: ' Docklands',
		service_id: '2#1',
		direction_id: 1,
		arrival_time: '14:49:32',
		arrival_timestamp: 53372,
		departure_time: '14:49:32',
		departure_timestamp: 53372,
		stop_sequence: 50,
		shape_id: '60-151-b12-1.90.I',
		shape_dist_traveled: 16848.07
	}
];

module.exports = { tripsMock1, tripsMock2, tripsMockAllLastStops, lastStopsMock1 };
