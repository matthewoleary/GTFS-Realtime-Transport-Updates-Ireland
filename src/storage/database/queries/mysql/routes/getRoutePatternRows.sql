SELECT
    t.trip_id,
    t.direction_id,
    t.trip_headsign,
    t.shape_id,
    st.stop_id,
    s.stop_code,
    s.stop_name,
    s.stop_lat,
    s.stop_lon,
    st.stop_sequence,
    st.pickup_type,
    st.drop_off_type
FROM trips t
JOIN stop_times st ON st.trip_id = t.trip_id
JOIN stops s ON s.stop_id = st.stop_id
WHERE t.route_id = ?
ORDER BY t.trip_id, st.stop_sequence;
