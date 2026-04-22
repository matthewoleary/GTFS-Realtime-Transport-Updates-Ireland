-- Retrieves shape details for a specific shape_id from the shapes table.
-- Pass the shape_id as a parameter.
SELECT shape_id,
       shape_pt_lat,
       shape_pt_lon,
       shape_pt_sequence,
       shape_dist_traveled
FROM shapes
WHERE shape_id = ?
