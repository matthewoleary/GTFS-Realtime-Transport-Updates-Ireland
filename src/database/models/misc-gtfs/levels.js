export default {
	filenameBase: 'levels',
	schema: [
		{
			name: 'level_id',
			type: 'varchar(255)',
			primary: true
		},
		{
			name: 'level_index',
			type: 'float',
			required: true
		},
		{
			name: 'level_name',
			type: 'varchar(64)'
		}
	]
};
