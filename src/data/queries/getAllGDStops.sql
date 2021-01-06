SELECT stop_id
    , stop_index
    , stop_name
    , stop_lat
    , stop_lon
FROM [dbo].[stops]
WHERE stop_id LIKE '%GD%'