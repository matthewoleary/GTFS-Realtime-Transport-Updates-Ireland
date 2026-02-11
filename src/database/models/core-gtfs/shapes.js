export default {
	filenameBase: 'shapes',
	schema: [
		{
			name: 'shape_id',
			type: 'varchar(32)',
			primary: true,
			required: true,
			index: true
		},
		{
			name: 'shape_pt_lat',
			type: 'real',
			required: true,
			min: -90,
			max: 90
		},
		{
			name: 'shape_pt_lon',
			type: 'real',
			required: true,
			min: -180,
			max: 180
		},
		{
			name: 'shape_pt_sequence',
			type: 'smallint unsigned',
			primary: true,
			required: true,
			min: 0
		},
		{
			name: 'shape_dist_traveled',
			type: 'real',
			required: false,
			min: 0
		}
	],
	indexes: [
		{
			fields: ['shape_id', 'shape_pt_sequence'],
            unique: false
		}
	]
};
