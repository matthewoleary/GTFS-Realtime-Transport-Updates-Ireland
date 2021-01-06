SELECT stop_id
    , stop_name
    , stop_lat
    , stop_lon
FROM [stops]
WHERE stop_id LIKE '%B%'
AND stop_id NOT LIKE '%DB%'