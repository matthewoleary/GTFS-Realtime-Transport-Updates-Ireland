export default {
	filenameBase: 'translations',
	schema: [
		{
			name: 'table_name',
			type: 'varchar(32)',
			primary: true,
			required: true
		},
		{
			name: 'field_name',
			type: 'varchar(64)',
			primary: true,
			required: true
		},
		{
			name: 'language',
			type: 'varchar(16)',
			primary: true,
			required: true
		},
		{
			name: 'translation',
			type: 'varchar(2047)',
			required: true
		},
		{
			name: 'record_id',
			type: 'varchar(255)',
			primary: true,
		},
		{
			name: 'record_sub_id',
			type: 'varchar(255)',
			primary: true
		},
		{
			name: 'field_value',
			type: 'varchar(2047)',
			primary: true
		}
	]
};
