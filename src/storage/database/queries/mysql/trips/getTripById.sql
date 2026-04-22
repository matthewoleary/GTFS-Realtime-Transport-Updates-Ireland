-- Get trip details for a given trip_id.
SELECT trip_id,
       route_id,
       service_id,
       trip_headsign,
       trip_short_name,
       direction_id,
       block_id,
       shape_id
FROM trips
WHERE trip_id = ?