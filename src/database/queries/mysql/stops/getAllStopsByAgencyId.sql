-- Retrieves all unique stops associated with a specific agency (by agency_id),
-- by joining stops, stop_times, trips, routes, and agency tables.
-- Pass an agency ID as the parameter to filter stops by agency.
--
-- Example usage:
--   WHERE a.agency_id = ?
--   Parameter: '7778019' (Dublin Bus) or any valid agency_id
SELECT DISTINCT s.stop_id,
             s.stop_code,
             s.stop_name,
             s.stop_lat,
             s.stop_lon
FROM stops s
WHERE EXISTS (
    SELECT 1
    FROM stop_times st
    JOIN trips t ON st.trip_id = t.trip_id
    JOIN routes r ON t.route_id = r.route_id
    WHERE st.stop_id = s.stop_id AND r.agency_id = ?
)