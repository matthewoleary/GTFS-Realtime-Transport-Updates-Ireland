export default {
	filenameBase: 'agency',
	schema: [
		{
			name: 'agency_id',
			type: 'varchar(16)',
			primary: true,
			required: true,
			index: true
		},
		{
			name: 'agency_name',
			type: 'varchar(64)',
			required: true
		},
		{
			name: 'agency_url',
			type: 'varchar(1020)',
			required: true
		},
		{
			name: 'agency_timezone',
			type: 'varchar(32)',
			required: true
		},
		{
			name: 'agency_lang',
			type: 'varchar(32)'
		},
		{
			name: 'agency_phone',
			type: 'varchar(64)'
		},
		{
			name: 'agency_fare_url',
			type: 'varchar(1020)'
		},
		{
			name: 'agency_email',
			type: 'varchar(64)'
		}
	]
};
