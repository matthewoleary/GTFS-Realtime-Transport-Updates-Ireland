-- Return all trips.
SELECT trip_id,
       route_id,
       service_id,
       trip_headsign,
       trip_short_name,
       direction_id,
       block_id,
       shape_id
FROM trips