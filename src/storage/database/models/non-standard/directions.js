export const filenameBase = 'directions';
export const nonstandard = true;
export const schema = [
	{
		name: 'id',
		type: 'integer',
		primary: true
	},
	{
		name: 'route_id',
		type: 'varchar(16)',
		required: true,
		index: true
	},
	{
		name: 'direction_id',
		type: 'integer',
		min: 0,
		max: 1,
		index: true
	},
	{
		name: 'direction',
		type: 'varchar(255)',
		required: true
	}
];
