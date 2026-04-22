export default {
	filenameBase: 'routes',
	schema: [
		{
			name: 'route_id',
			type: 'varchar(16)',
			index: true,
			primary: true
		},
		{
			name: 'agency_id',
			type: 'varchar(16)',
			required: true,
			index: true,
			foreign_key: {
				table: 'agency',
				column: 'agency_id'
			}
		},
		{
			name: 'route_short_name',
			type: 'varchar(16)'
		},
		{
			name: 'route_long_name',
			type: 'varchar(128)'
		},
		{
			name: 'route_desc',
			type: 'varchar(255)'
		},
		{
			name: 'route_type',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 12
		},
		{
			name: 'route_url',
			type: 'varchar(1020)'
		},
		{
			name: 'route_color',
			type: 'varchar(6)',
			required: false
		},
		{
			name: 'route_text_color',
			type: 'varchar(6)',
			required: false
		},
		{
			name: 'route_sort_order',
			type: 'integer',
			min: 0
		},
		{
			name: 'continuous_pickup',
			type: 'tinyint unsigned',
			min: 0,
			max: 3
		},
		{
			name: 'continuous_drop_off',
			type: 'tinyint unsigned',
			min: 0,
			max: 3
		}
	]
};
