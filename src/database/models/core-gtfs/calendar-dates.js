export default {
	filenameBase: 'calendar_dates',
	schema: [
		{
			name: 'service_id',
			type: 'varchar(8)',
			primary: true,
			required: true,
			index: true,
			foreign_key: {
				table: 'calendar',
				column: 'service_id'
			}
		},
		{
			name: 'date',
			type: 'integer',
			primary: true,
			required: true,
			index: true
		},
		{
			name: 'exception_type',
			type: 'tinyint unsigned',
			required: true,
			index: true,
			min: 1,
			max: 2
		}
	],
	indexes: [
		{ fields: ['service_id', 'date', 'exception_type'], unique: false }
	]
};
