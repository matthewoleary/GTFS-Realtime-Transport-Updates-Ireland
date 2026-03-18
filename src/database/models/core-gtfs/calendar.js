export default {
	filenameBase: 'calendar',
	schema: [
		{
			name: 'service_id',
			type: 'varchar(8)',
			required: true,
			primary: true
		},
		{
			name: 'monday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'tuesday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'wednesday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'thursday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'friday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'saturday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'sunday',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'start_date',
			type: 'integer',
			required: true,
			index: true
		},
		{
			name: 'end_date',
			type: 'integer',
			required: true,
			index: true
		}
	],
	indexes: [
		{ fields: ['start_date', 'end_date', 'monday'] },
		{ fields: ['start_date', 'end_date', 'tuesday'] },
		{ fields: ['start_date', 'end_date', 'wednesday'] },
		{ fields: ['start_date', 'end_date', 'thursday'] },
		{ fields: ['start_date', 'end_date', 'friday'] },
		{ fields: ['start_date', 'end_date', 'saturday'] },
		{ fields: ['start_date', 'end_date', 'sunday'] }
	]
};
