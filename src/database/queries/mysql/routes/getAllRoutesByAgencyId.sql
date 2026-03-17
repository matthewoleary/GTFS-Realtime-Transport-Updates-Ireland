-- Retrieves all routes for a specific agency.
-- Pass the agency_id as a parameter.
SELECT r.route_id,
       r.agency_id,
       a.agency_id,
       a.agency_name,
       r.route_short_name,
       r.route_long_name,
       r.route_type
FROM routes r
JOIN agency a ON r.agency_id = a.agency_id
WHERE r.agency_id = ?
ORDER BY r.route_short_name
