export const filenameBase = 'stop_attributes';
export const nonstandard = true;
export const schema = [
	{
		name: 'id',
		type: 'integer',
		primary: true
	},
	{
		name: 'stop_id',
		type: 'varchar(16)',
		required: true,
		index: true
	},
	{
		name: 'stop_city',
		type: 'varchar(255)'
	}
];
