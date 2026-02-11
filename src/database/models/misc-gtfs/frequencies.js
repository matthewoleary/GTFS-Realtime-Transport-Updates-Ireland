export default {
	filenameBase: 'frequencies',
	schema: [
		{
			name: 'trip_id',
			type: 'varchar(32)',
			primary: true,
			required: true,
			index: true
		},
		{
			name: 'start_time',
			type: 'varchar(10)',
			primary: true,
			required: true,
			format: 'HH:MM:SS'
		},
		{
			name: 'end_time',
			type: 'varchar(10)',
			required: true,
			format: 'HH:MM:SS'
		},
		{
			name: 'start_timestamp',
			type: 'int unsigned',
			required: false
		},
		{
			name: 'end_timestamp',
			type: 'int unsigned',
			required: false
		},
		{
			name: 'headway_secs',
			type: 'mediumint unsigned',
			required: true,
			min: 0
		},
		{
			name: 'exact_times',
			type: 'tinyint unsigned',
			min: 0,
			max: 1
		}
	]
};
