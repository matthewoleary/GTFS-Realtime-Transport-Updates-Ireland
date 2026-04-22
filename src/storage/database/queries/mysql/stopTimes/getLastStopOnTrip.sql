-- Retrieves the last stop for a given trip_id from stop_times.
-- Orders stops by stop_sequence in descending order and returns the first (highest) one.
-- Pass the trip_id as a parameter.
-- Efficient if an index exists on (trip_id, stop_sequence).
SELECT trip_id,
       stop_id,
       stop_sequence
FROM stop_times
WHERE trip_id = ?
ORDER BY stop_sequence DESC
LIMIT 1
