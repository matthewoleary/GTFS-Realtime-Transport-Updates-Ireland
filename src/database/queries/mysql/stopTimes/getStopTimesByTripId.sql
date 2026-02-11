-- Get all stop times for a given trip_id
-- Returns stop times in the order they occur along the trip
-- trip_id should be indexed for best performance
-- Usage: Pass the desired trip_id as a parameter
-- Columns returned match the stop_times schema
SELECT trip_id,
       arrival_time,
       arrival_timestamp,
       departure_time,
       departure_timestamp,
       stop_id,
       stop_sequence,
       stop_headsign,
       pickup_type,
       drop_off_type,
       timepoint
FROM stop_times
WHERE trip_id = ?
ORDER BY stop_sequence
