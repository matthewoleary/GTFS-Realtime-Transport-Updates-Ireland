
// getTripsAtStopIdQuery.js
//
// Generates a MySQL query for trips at a stop on any day, with safe day column validation.
//
// Purpose:
//   - Retrieves all trips that stop at a specific stop on a given day, within a specified time window, and are available for pickup.
//   - Useful for real-time or scheduled queries for a stop on any day of the week.
//
// How it works:
//   1. Joins stop_times, trips, and routes for all relevant details.
//   2. Filters for stop_id (parameterized), so only trips stopping at the specified stop are included.
//   3. Filters for service_id:
//      - Includes trips active on the given date and for the provided day of the week (e.g., 'friday'), or added as an exception for that date.
//      - Excludes trips removed as exceptions for that date.
//   4. Filters for departure time window (departure_timestamp >= ? AND <= ?), so only trips departing within the window are included.
//      - To retrieve trips from up to 2 hours ago, pass the lower bound (now - 2 hours) as a parameter.
//   5. Only includes regular pickups (pickup_type = 0).
//   6. Results are ordered by departure_timestamp (soonest first).
//
// Parameters:
//   - serviceDay: Object containing scheduleDay (day-of-week column name) and scheduleDate (service date in YYYYMMDD), validated and injected.
//   - ? placeholders: For stop_id, time window bounds (minDepartureTimestamp, maxDepartureTimestamp), etc., to be passed as parameters.
//
// Usage:
//   - Use this function to generate a query for trips at a stop on any day, passing a validated day column and date.
//   - Pass stop_id and time window values as parameters to your database driver.


import { validateDayColumn, validateDateValue } from '../../../utils/utils.js';


function getTripsAtStopIdQuery(serviceDay) {
  validateDayColumn(serviceDay.dayColumn);
  validateDateValue(serviceDay.date);

  return `
    -- Retrieve all trips stopping at a specific stop on a given day, ready for pickup
    SELECT
      t.trip_id,
      t.trip_headsign,
      t.route_id,
      r.route_short_name,
      r.route_long_name,
      r.agency_id,
      st.stop_id,
      st.arrival_time,
      st.arrival_timestamp,
      st.departure_time,
      st.departure_timestamp,
      st.stop_sequence,
      t.service_id,
      t.direction_id,
      t.shape_id
    FROM stop_times st
    JOIN trips t ON st.trip_id = t.trip_id
    JOIN routes r ON t.route_id = r.route_id
    WHERE st.stop_id = ?
      AND st.departure_timestamp >= ${serviceDay.lowerBoundTimestamp}
      AND st.departure_timestamp <= ${serviceDay.upperBoundTimestamp}
      AND t.service_id IN (
        SELECT service_id FROM calendar
          WHERE start_date <= ${serviceDay.date}
            AND end_date >= ${serviceDay.date}
            AND ${serviceDay.dayColumn} = 1
        UNION
        SELECT service_id FROM calendar_dates
          WHERE date = ${serviceDay.date} AND exception_type = 1
      )
      AND t.service_id NOT IN (
        SELECT service_id FROM calendar_dates
          WHERE date = ${serviceDay.date} AND exception_type = 2
      )
      AND st.pickup_type = 0
    ORDER BY st.departure_timestamp;
  `;
}

export default getTripsAtStopIdQuery;
