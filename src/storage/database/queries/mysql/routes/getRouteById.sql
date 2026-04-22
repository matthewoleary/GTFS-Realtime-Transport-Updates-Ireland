-- Retrieves route details and agency name for a specific route_id.
-- Joins routes and agency tables on agency_id.
-- Pass the route_id as a parameter.
SELECT r.route_id,
       r.agency_id,
       a.agency_name,
       r.route_short_name,
       r.route_long_name,
       r.route_type
FROM routes r
JOIN agency a ON r.agency_id = a.agency_id
WHERE r.route_id = ?