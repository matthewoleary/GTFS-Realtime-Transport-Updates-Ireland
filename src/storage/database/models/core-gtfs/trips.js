export default {
	filenameBase: 'trips',
	schema: [
		{
			name: 'route_id',
			type: 'varchar(16)',
			required: true,
			index: true,
			foreign_key: {
				table: 'routes',
				column: 'route_id'
			}
		},
		{
			name: 'service_id',
			type: 'varchar(8)',
			required: true,
			index: true,
			foreign_key: {
				table: 'calendar',
				column: 'service_id'
			}
		},
		{
			name: 'trip_id',
			type: 'varchar(32)',
			primary: true,
			required: true,
			index: true
		},
		{
			name: 'trip_headsign',
			type: 'varchar(64)',
			required: false
		},
		{
			name: 'trip_short_name',
			type: 'varchar(32)',
			required: false
		},
		{
			name: 'direction_id',
			type: 'tinyint unsigned',
			required: false,
			min: 0,
			max: 1
		},
		{
			name: 'block_id',
			type: 'varchar(64)'
		},
		{
			name: 'shape_id',
			type: 'varchar(32)'
		},
		{
			name: 'wheelchair_accessible',
			type: 'tinyint unsigned',
			required: false,
			min: 0,
			max: 2
		},
		{
			name: 'bikes_allowed',
			type: 'tinyint unsigned',
			required: false,
			min: 0,
			max: 2
		},
		{
			name: 'cars_allowed',
			type: 'tinyint unsigned',
			required: false,
			min: 0,
			max: 2
		}
	]
};
