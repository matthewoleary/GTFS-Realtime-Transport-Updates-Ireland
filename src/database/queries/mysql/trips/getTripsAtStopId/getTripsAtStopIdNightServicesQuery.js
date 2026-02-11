
// getTripsAtStopIdNightServicesQuery.js
//
// Generates a MySQL query for night services at a stop, spanning two days, with safe day column validation.
//
// Purpose:
//   - Retrieves all trips that stop at a specific stop during “night service” hours, spanning two consecutive days (e.g., late Friday night into early Saturday morning).
//   - Useful for finding trips that cross midnight and are relevant to both the current and next day.
//
// How it works:
//   1. First SELECT (wrapped Day):
//      - Joins stop_times, trips, and routes for all relevant details.
//      - Filters for stop_id, service_id active on wrappedDayDate/wrappedDayColumn, and time window (departure_timestamp >= ? AND <= ?).
//      - Only includes regular pickups (pickup_type = 0).
//   2. Second SELECT (unwrapped Day):
//      - Same joins and stop_id filter.
//      - Filters for service_id active on unwrappedDayDate/unwrappedDayColumn, and early morning window (departure_timestamp <= ?).
//      - Only includes regular pickups.
//   3. UNION:
//      - Combines both SELECTs to cover the full night service period across two days.
//   4. ORDER BY departure_timestamp:
//      - Results are ordered chronologically by departure time.
//
// Parameters:
//   - wrappedDayColumn, unwrappedDayColumn: Day-of-week column names (e.g., 'friday', 'saturday'), validated and injected.
//   - wrappedDayDate, unwrappedDayDate: Service dates for each part, validated and injected.
//   - ? placeholders: For stop_id, time window bounds, etc., to be passed as parameters.
//
// Usage:
//   - Use this function to generate a query for night services at a stop, passing validated day columns and dates.
//   - Pass stop_id and time window values as parameters to your database driver.


import { validateDayColumn, validateDateValue } from '../../../utils/utils.js';

function getTripsAtStopIdNightServicesQuery(wrappedServiceDay, unwrappedServiceDay) {
  validateDayColumn(wrappedServiceDay.dayColumn);
  validateDayColumn(unwrappedServiceDay.dayColumn);
  validateDateValue(wrappedServiceDay.date);
  validateDateValue(unwrappedServiceDay.date);
  return `
    -- Retrieve all trips stopping at a specific stop for night services, spanning two days
    (
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
        AND t.service_id IN (
          SELECT service_id FROM calendar
            WHERE start_date <= ${wrappedServiceDay.date}
              AND end_date >= ${wrappedServiceDay.date}
              AND ${wrappedServiceDay.dayColumn} = 1
          UNION
          SELECT service_id FROM calendar_dates
            WHERE date = ${wrappedServiceDay.date} AND exception_type = 1
        )
        AND t.service_id NOT IN (
          SELECT service_id FROM calendar_dates
            WHERE date = ${wrappedServiceDay.date} AND exception_type = 2
        )
        AND st.departure_timestamp >= ${wrappedServiceDay.lowerBoundTimestamp}
        AND st.departure_timestamp <= ${wrappedServiceDay.upperBoundTimestamp}
        AND st.pickup_type = 0
    )
    UNION
    (
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
        AND t.service_id IN (
          SELECT service_id FROM calendar
            WHERE start_date <= ${unwrappedServiceDay.date}
              AND end_date >= ${unwrappedServiceDay.date}
              AND ${unwrappedServiceDay.dayColumn} = 1
          UNION
          SELECT service_id FROM calendar_dates
            WHERE date = ${unwrappedServiceDay.date} AND exception_type = 1
        )
        AND t.service_id NOT IN (
          SELECT service_id FROM calendar_dates
            WHERE date = ${unwrappedServiceDay.date} AND exception_type = 2
        )
        AND st.departure_timestamp >= ${unwrappedServiceDay.lowerBoundTimestamp}
        AND st.departure_timestamp <= ${unwrappedServiceDay.upperBoundTimestamp}
        AND st.pickup_type = 0
    )
    ORDER BY departure_timestamp;
  `;
}

export default getTripsAtStopIdNightServicesQuery;
