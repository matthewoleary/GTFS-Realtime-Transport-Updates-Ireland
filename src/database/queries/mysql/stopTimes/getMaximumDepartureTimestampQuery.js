// getMaximumDepartureTimestampQuery.js
//
// Generates a MySQL query for the maximum departure_timestamp for a given service date and day column.
//
// Usage:
//   - Pass a validated day column (e.g., 'monday') and a date value (e.g., 20240115).
//   - Use parameter placeholders (?) for all date values.
//   - Inject the day column name directly after validation.

import { validateDayColumn, validateDateValue } from '../../utils/utils.js';

function getMaximumDepartureTimestampQuery(dayColumn, dateValue) {
  validateDayColumn(dayColumn);
  validateDateValue(dateValue);

  return `
    -- Get the maximum departure_timestamp for a specific service date and day
    SELECT MAX(st.departure_timestamp) AS max_departure_timestamp
    FROM stop_times st
    JOIN trips t ON st.trip_id = t.trip_id
    WHERE t.service_id IN (
      SELECT service_id FROM calendar
        WHERE start_date <= ${dateValue} AND end_date >= ${dateValue} AND ${dayColumn} = 1
      UNION
      SELECT service_id FROM calendar_dates
        WHERE date = ${dateValue} AND exception_type = 1
    )
    AND t.service_id NOT IN (
      SELECT service_id FROM calendar_dates
        WHERE date = ${dateValue} AND exception_type = 2
    );
  `;
}

export default getMaximumDepartureTimestampQuery;
