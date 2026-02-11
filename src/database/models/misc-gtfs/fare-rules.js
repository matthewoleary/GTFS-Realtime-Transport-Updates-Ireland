export default {
	filenameBase: 'fare_rules',
	schema: [
		{
			name: 'fare_id',
			type: 'varchar(255)',
			required: true,
			index: true
		},
		{
			name: 'route_id',
			type: 'varchar(16)',
			index: true
		},
		{
			name: 'origin_id',
			type: 'varchar(255)'
		},
		{
			name: 'destination_id',
			type: 'varchar(255)'
		},
		{
			name: 'contains_id',
			type: 'varchar(255)'
		}
	]
};
