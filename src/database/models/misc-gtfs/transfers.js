export default {
	filenameBase: 'transfers',
	schema: [
		{
			name: 'from_stop_id',
			type: 'varchar(16)',
			primary: true,
			index: true
		},
		{
			name: 'to_stop_id',
			type: 'varchar(16)',
			primary: true,
			index: true
		},
		{
			name: 'from_route_id',
			type: 'varchar(16)',
			primary: true,
		},
		{
			name: 'to_route_id',
			type: 'varchar(16)',
			primary: true,
		},
		{
			name: 'from_trip_id',
			type: 'varchar(32)',
			primary: true,
		},
		{
			name: 'to_trip_id',
			type: 'varchar(32)',
			primary: true,
		},
		{
			name: 'transfer_type',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 3
		},
		{
			name: 'min_transfer_time',
			type: 'tinyint unsigned',
			requited: false,
			min: 0
		}
	]
};
