-- Retrieves all unique stops associated with a specific agency (by agency name),
-- by joining stops, stop_times, trips, routes, and agency tables.
-- Pass an agency name as the parameter to filter stops by agency (case-insensitive, partial match).
-- Pass NULL as the parameter to return all stops for all agencies.
--
-- Example usage:
--   WHERE (? IS NULL OR a.agency_name LIKE CONCAT('%', ?, '%'))
--   Parameter: 'Dublin Bus' or NULL
SELECT DISTINCT s.stop_id,
       s.stop_code,
       s.stop_name,
       s.stop_lat,
       s.stop_lon,
       a.agency_name
FROM stops s
JOIN stop_times st ON s.stop_id = st.stop_id
JOIN trips t ON st.trip_id = t.trip_id
JOIN routes r ON t.route_id = r.route_id
JOIN agency a ON r.agency_id = a.agency_id
WHERE (? IS NULL OR a.agency_name LIKE CONCAT('%', ?, '%'))