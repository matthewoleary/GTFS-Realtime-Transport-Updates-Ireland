-- Retrieves all routes, optionally filtered by agency name.
-- Pass an agency name as the parameter to filter routes by agency (case-insensitive, partial match).
-- Pass NULL as the parameter to return all routes.
-- Example usage:
--   SELECT ... WHERE (? IS NULL OR a.agency_name LIKE CONCAT('%', ?, '%'))
--   Parameters: 'Dublin Bus' or NULL
SELECT r.route_id,
       r.agency_id,
       a.agency_id,
       a.agency_name,
       r.route_short_name,
       r.route_long_name,
       r.route_type
FROM routes r
JOIN agencies a ON r.agency_id = a.agency_id
WHERE (? IS NULL OR a.agency_name LIKE CONCAT('%', ?, '%'))
ORDER BY r.route_short_name
