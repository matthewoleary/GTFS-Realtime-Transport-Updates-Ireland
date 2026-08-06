SELECT shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence, shape_dist_traveled
FROM shapes
WHERE shape_id IN (?)
ORDER BY shape_id, shape_pt_sequence;
