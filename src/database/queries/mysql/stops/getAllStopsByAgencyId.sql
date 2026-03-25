-- Retrieves all unique stops associated with a specific agency (by agency_id),
-- by selecting from stops and using an EXISTS subquery over stop_times, trips, and routes
-- filtered by routes.agency_id.
--
-- Example usage:
--   WHERE r.agency_id = ?
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