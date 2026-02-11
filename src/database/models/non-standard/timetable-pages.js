export const filenameBase = 'timetable_pages';
export const nonstandard = true;
export const schema = [
  {
    name: 'timetable_page_id',
    type: 'varchar(255)',
    primary: true
  },
  {
    name: 'timetable_page_label',
    type: 'varchar(255)'
  },
  {
    name: 'filename',
    type: 'varchar(255)'
  }
];
