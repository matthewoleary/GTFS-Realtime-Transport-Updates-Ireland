-- Get trip details for a given trip_id, or all trips if no id is provided
-- If trip_id parameter is NULL, all trips are returned
-- If trip_id is provided, only that trip is returned
-- Pass the same parameter twice: once for NULL check, once for filtering
-- trip_id should be indexed (ideally PRIMARY KEY) for best performance
SELECT trip_id,
       route_id,
       service_id,
       trip_headsign,
       trip_short_name,
       direction_id,
       block_id,
       shape_id
FROM trips
WHERE (? IS NULL OR trip_id = ?)
