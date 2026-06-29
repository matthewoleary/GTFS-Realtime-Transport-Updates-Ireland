-- Retrieves every stop and the unique routes serving it.
--
-- The routes column is a JSON array containing route_id, agency_id,
-- route_short_name, route_long_name, and route_type for each route.
-- Stops without an associated route are retained and return routes as [].
-- The inner DISTINCT prevents repeated route objects when multiple trips
-- on the same route serve the same stop.
SELECT
    s.stop_id,
    s.stop_code,
    s.stop_name,
    s.stop_lat,
    s.stop_lon,
    COALESCE(sr.routes, JSON_ARRAY()) AS routes
FROM stops s
LEFT JOIN (
    SELECT
        sri.stop_id,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'route_id', r.route_id,
                'agency_id', r.agency_id,
                'route_short_name', r.route_short_name,
                'route_long_name', r.route_long_name,
                'route_type', r.route_type
            )
        ) AS routes
    FROM (
        SELECT DISTINCT
            st.stop_id,
            t.route_id
        FROM stop_times st
        JOIN trips t ON t.trip_id = st.trip_id
    ) sri
    JOIN routes r ON r.route_id = sri.route_id
    GROUP BY sri.stop_id
) sr ON sr.stop_id = s.stop_id;
