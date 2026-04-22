-- Retrieves stop details for a specific stop_id from the stops table.
-- Pass the stop_id as a parameter.
SELECT stop_id,
       stop_name,
       stop_lat,
       stop_lon
FROM stops
WHERE stop_id = ?
