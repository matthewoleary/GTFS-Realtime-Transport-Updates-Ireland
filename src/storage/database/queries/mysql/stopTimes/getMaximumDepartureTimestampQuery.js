import { validateDayColumn, validateDateValue } from '../../utils/utils.js';

/**
 * Generates a MySQL query for the maximum departure_timestamp for a given service date and day column.
 *
 * @param {string} dayColumn - Validated day column (e.g., 'monday').
 * @param {number} dateValue - Date value in YYYYMMDD format (e.g., 20260316).
 * @returns {string} The generated SQL query string.
 *
 * Usage:
 *   - Pass a validated day column and a date value.
 *   - Inject the day column name directly after validation (never from user input without validation).
 *   - All date values are injected as numbers (not strings).
 *
 * Query breakdown:
 *   1. The derived table (valid_services) selects all service_ids active for the date (from calendar or calendar_dates).
 *   2. The LEFT JOIN excludes any service_id that is marked as exception_type = 2 for the date (service removed).
 *   3. The MAX aggregate finds the latest departure_timestamp for all valid trips on that date.
 */
function getMaximumDepartureTimestampQuery(dayColumn, dateValue) {
  validateDayColumn(dayColumn);
  validateDateValue(dateValue);

  return `
    -- Get the maximum departure_timestamp for a specific service date and day
    SELECT MAX(st.departure_timestamp) AS max_departure_timestamp
    FROM stop_times st
    JOIN trips t ON st.trip_id = t.trip_id
    JOIN (
      SELECT c.service_id
      FROM calendar c
      WHERE c.start_date <= ${dateValue}
        AND c.end_date >= ${dateValue}
        AND c.${dayColumn} = 1
      UNION
      SELECT cd.service_id
      FROM calendar_dates cd
      WHERE cd.date = ${dateValue}
        AND cd.exception_type = 1
    ) AS valid_services ON t.service_id = valid_services.service_id
    LEFT JOIN calendar_dates cd2
      ON t.service_id = cd2.service_id
      AND cd2.date = ${dateValue}
      AND cd2.exception_type = 2
    WHERE cd2.service_id IS NULL;
  `;
}

export default getMaximumDepartureTimestampQuery;
