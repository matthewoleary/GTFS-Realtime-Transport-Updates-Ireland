-- Retrieves stops served by routes belonging to a specific agency.
-- Pass the agency_id as a parameter.
--
-- Each stop is returned once, with routes containing only unique routes
-- operated by the requested agency. Stops not served by that agency are
-- excluded. The inner DISTINCT prevents repeated route objects when
-- multiple trips on the same route serve the same stop.
SELECT
    s.stop_id,
    s.stop_code,
    s.stop_name,
    s.stop_lat,
    s.stop_lon,
    sr.routes
FROM (
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
        FROM routes agency_route
        JOIN trips t
            ON t.route_id = agency_route.route_id
        JOIN stop_times st
            ON st.trip_id = t.trip_id
        WHERE agency_route.agency_id = ?
    ) sri
    JOIN routes r
        ON r.route_id = sri.route_id
    GROUP BY sri.stop_id
) sr
JOIN stops s
    ON s.stop_id = sr.stop_id;
