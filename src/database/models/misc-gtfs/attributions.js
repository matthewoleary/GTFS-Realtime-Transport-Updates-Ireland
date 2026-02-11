export default {
	filenameBase: 'attributions',
	schema: [
		{
			name: 'attribution_id',
			type: 'varchar(255)',
			primary: true
		},
		{
			name: 'agency_id',
			type: 'varchar(16)'
		},
		{
			name: 'route_id',
			type: 'varchar(16)'
		},
		{
			name: 'trip_id',
			type: 'varchar(32)'
		},
		{
			name: 'organization_name',
			type: 'varchar(255)',
			required: true
		},
		{
			name: 'is_producer',
			type: 'tinyint unsigned',
			min: 0,
			max: 1
		},
		{
			name: 'is_operator',
			type: 'tinyint unsigned',
			min: 0,
			max: 1
		},
		{
			name: 'is_authority',
			type: 'tinyint unsigned',
			min: 0,
			max: 1
		},
		{
			name: 'attribution_url',
			type: 'varchar(2047)'
		},
		{
			name: 'attribution_email',
			type: 'varchar(64)'
		},
		{
			name: 'attribution_phone',
			type: 'varchar(64)'
		}
	]
};
