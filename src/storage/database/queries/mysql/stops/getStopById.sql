-- Retrieves a specific stop and the unique routes serving it.
-- Pass the stop_id as a parameter.
--
-- The routes column is a JSON array containing route_id, agency_id,
-- route_short_name, route_long_name, and route_type for each route.
-- A stop without an associated route returns routes as []. The DISTINCT
-- in stop_routes prevents repeated route objects when multiple trips on
-- the same route serve the stop.
WITH requested_stop AS (
    SELECT stop_id,
           stop_code,
           stop_name,
           stop_lat,
           stop_lon
    FROM stops
    WHERE stop_id = ?
),
stop_routes AS (
    SELECT DISTINCT st.stop_id,
                    r.route_id,
                    r.agency_id,
                    r.route_short_name,
                    r.route_long_name,
                    r.route_type
    FROM stop_times st
    JOIN requested_stop s ON s.stop_id = st.stop_id
    JOIN trips t ON t.trip_id = st.trip_id
    JOIN routes r ON r.route_id = t.route_id
)
SELECT s.stop_id,
       s.stop_code,
       s.stop_name,
       s.stop_lat,
       s.stop_lon,
       CASE
           WHEN COUNT(sr.route_id) = 0 THEN JSON_ARRAY()
           ELSE JSON_ARRAYAGG(
               JSON_OBJECT(
                   'route_id', sr.route_id,
                   'agency_id', sr.agency_id,
                   'route_short_name', sr.route_short_name,
                   'route_long_name', sr.route_long_name,
                   'route_type', sr.route_type
               )
           )
       END AS routes
FROM requested_stop s
LEFT JOIN stop_routes sr ON sr.stop_id = s.stop_id
GROUP BY s.stop_id,
         s.stop_code,
         s.stop_name,
         s.stop_lat,
         s.stop_lon
