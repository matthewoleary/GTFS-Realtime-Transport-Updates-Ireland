-- Get all stop times for a given trip_id
-- Returns stop times in the order they occur along the trip
-- trip_id should be indexed for best performance
-- Usage: Pass the desired trip_id as a parameter
-- Columns returned match the stop_times schema
SELECT st.trip_id,
       st.arrival_time,
       st.arrival_timestamp,
       st.departure_time,
       st.departure_timestamp,
       st.stop_id,
       s.stop_code,
       s.stop_name,
       st.stop_sequence,
       st.stop_headsign,
       s.stop_lat,
       s.stop_lon,
       st.pickup_type,
       st.drop_off_type,
       st.timepoint
FROM stop_times AS st
LEFT JOIN stops AS s ON st.stop_id = s.stop_id
WHERE st.trip_id = ?
ORDER BY st.stop_sequence
