export const filenameBase = 'timetable_notes';
export const nonstandard = true;
export const schema = [
  {
    name: 'note_id',
    type: 'varchar(255)',
    primary: true
  },
  {
    name: 'symbol',
    type: 'varchar(255)'
  },
  {
    name: 'note',
    type: 'varchar(2047)'
  }
];
