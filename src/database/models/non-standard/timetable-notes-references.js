export const filenameBase = 'timetable_notes_references';
export const nonstandard = true;
export const schema = [
	{
		name: 'note_id',
		type: 'varchar(255)',
		primary: true
	},
	{
		name: 'timetable_id',
		type: 'varchar(255)',
		index: true
	},
	{
		name: 'route_id',
		type: 'varchar(16)',
		index: true
	},
	{
		name: 'trip_id',
		type: 'varchar(32)',
		index: true
	},
	{
		name: 'stop_id',
		type: 'varchar(16)',
		index: true
	},
	{
		name: 'stop_sequence',
		type: 'integer',
		min: 0,
		index: true
	},
	{
		name: 'show_on_stoptime',
		type: 'integer',
		min: 0,
		max: 1
	}
];
