-- Retrieves agency details for a specific agency_id from the agency table.
-- Pass the agency_id as a parameter.
SELECT agency_id,
       agency_name,
       agency_url,
       agency_timezone
FROM agency
WHERE agency_id = ?
