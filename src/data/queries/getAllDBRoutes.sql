SELECT route_id
    , route_index
    , agency_id
    , route_short_name
    , route_long_name
    , route_type
FROM [dbo].[routes]
WHERE agency_id = '978'