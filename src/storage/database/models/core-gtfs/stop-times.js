export default {
    filenameBase: 'stop_times',
    schema: [
        {
            name: 'trip_id',
            type: 'varchar(32)',
            primary: true,
            required: true
        },
        {
            name: 'arrival_time',
            type: 'varchar(8)',
            format: 'HH:MM:SS'
        },
        {
            name: 'departure_time',
            type: 'varchar(8)',
            format: 'HH:MM:SS'
        },
        {
            name: 'stop_id',
            type: 'varchar(16)'
        },
        {
            name: 'stop_sequence',
            type: 'tinyint unsigned',
            primary: true,
            required: true,
            min: 0
        },
        {
            name: 'stop_headsign',
            type: 'varchar(64)'
        },
        {
            name: 'pickup_type',
            type: 'tinyint unsigned',
            min: 0,
            max: 3
        },
        {
            name: 'drop_off_type',
            type: 'tinyint unsigned',
            min: 0,
            max: 3
        },
        {
            name: 'continuous_pickup',
            type: 'tinyint unsigned',
            min: 0,
            max: 3
        },
        {
            name: 'continuous_drop_off',
            type: 'tinyint unsigned',
            min: 0,
            max: 3
        },
        {
            name: 'shape_dist_traveled',
            type: 'real',
            min: 0
        },
        {
            name: 'timepoint',
            type: 'tinyint unsigned',
            min: 0,
            max: 1
        }
    ],
    indexes: [
        {
            fields: ['stop_id', 'departure_timestamp'],
            unique: false
        }
    ]
};
