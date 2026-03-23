export default {
	filenameBase: 'stops',
	schema: [
		{
			name: 'stop_id',
			type: 'varchar(16)',
			primary: true
		},
		{
			name: 'stop_code',
			type: 'varchar(16)'
		},
		{
			name: 'stop_name',
			type: 'varchar(64)'
		},
		{
			name: 'tts_stop_name',
			type: 'varchar(255)'
		},
		{
			name: 'stop_desc',
			type: 'varchar(255)'
		},
		{
			name: 'stop_lat',
			type: 'real',
			min: -90,
			max: 90
		},
		{
			name: 'stop_lon',
			type: 'real',
			min: -180,
			max: 180
		},
		{
			name: 'zone_id',
			type: 'varchar(255)'
		},
		{
			name: 'stop_url',
			type: 'varchar(1020)'
		},
		{
			name: 'location_type',
			type: 'tinyint unsigned',
			min: 0,
			max: 4
		},
		{
			name: 'parent_station',
			type: 'varchar(255)',
			foreign_key: {
				table: 'stops',
				column: 'stop_id'
			}
		},
		{
			name: 'stop_timezone',
			type: 'varchar(32)'
		},
		{
			name: 'wheelchair_boarding',
			type: 'tinyint unsigned',
			min: 0,
			max: 2
		},
		{
			name: 'level_id',
			type: 'varchar(255)'
		},
		{
			name: 'platform_code',
			type: 'varchar(32)'
		}
	]
};
