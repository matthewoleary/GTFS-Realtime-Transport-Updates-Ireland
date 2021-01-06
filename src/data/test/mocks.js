'use-strict';

const dotenv = require('dotenv');

dotenv.config();

const {
	DOCKER_SQL_USER,
	DOCKER_SQL_PASSWORD,
	DOCKER_SQL_SERVER,
	DOCKER_SQL_DATABASE
} = process.env;

const mockConfig = {
	server: DOCKER_SQL_SERVER,
	database: DOCKER_SQL_DATABASE,
	user: DOCKER_SQL_USER,
	password: DOCKER_SQL_PASSWORD,
	options: {
		enableArithAbort: true,
		validateBulkLoadParameters: true,
		trustServerCertificate: true
	}
};

const loadSqlQueriesResponseMock = {
	getAgencyById: 'SELECT agency_id\n' +
        '    , agency_name\n' +
        '    , agency_url\n' +
        '    , agency_timezone\n' +
        '    , agency_lang\n' +
        'FROM [dbo].[agency]\n' +
        'WHERE agency_id = @agencyId\n',
	getAllAgencies: 'SELECT agency_id\n' +
        '    , agency_name\n' +
        '    , agency_url\n' +
        '    , agency_timezone\n' +
        '    , agency_lang\n' +
        'FROM [dbo].[agency]',
	getAllBRoutes: 'SELECT route_id\n' +
        '    , route_index\n' +
        '    , agency_id\n' +
        '    , route_short_name\n' +
        '    , route_long_name\n' +
        '    , route_type\n' +
        'FROM [dbo].[routes]\n' +
        'WHERE agency_id = \'01\'',
	getAllBStops: 'SELECT stop_id\n' +
        '    , stop_name\n' +
        '    , stop_lat\n' +
        '    , stop_lon\n' +
        'FROM [stops]\n' +
        'WHERE stop_id LIKE \'%B%\'\n' +
        'AND stop_id NOT LIKE \'%DB%\'',
	getAllDBRoutes: 'SELECT route_id\n' +
        '    , route_index\n' +
        '    , agency_id\n' +
        '    , route_short_name\n' +
        '    , route_long_name\n' +
        '    , route_type\n' +
        'FROM [dbo].[routes]\n' +
        'WHERE agency_id = \'978\'',
	getAllDBStops: 'SELECT stop_id\n' +
        '    , stop_index\n' +
        '    , stop_name\n' +
        '    , stop_lat\n' +
        '    , stop_lon\n' +
        'FROM [dbo].[stops]\n' +
        'WHERE stop_id LIKE \'%DB%\'',
	getAllGDRoutes: 'SELECT route_id\n' +
        '    , route_index\n' +
        '    , agency_id\n' +
        '    , route_short_name\n' +
        '    , route_long_name\n' +
        '    , route_type\n' +
        'FROM [dbo].[routes]\n' +
        'WHERE agency_id = \'03\'\n' +
        'OR agency_id = \'03C\'',
	getAllGDStops: 'SELECT stop_id\n' +
        '    , stop_index\n' +
        '    , stop_name\n' +
        '    , stop_lat\n' +
        '    , stop_lon\n' +
        'FROM [dbo].[stops]\n' +
        'WHERE stop_id LIKE \'%GD%\'',
	getAllRoutes: 'SELECT route_id\n' +
        '    , route_index\n' +
        '    , agency_id\n' +
        '    , route_short_name\n' +
        '    , route_long_name\n' +
        '    , route_type\n' +
        'FROM [dbo].[routes]',
	getAllStops: 'SELECT stop_id\n' +
        '    , stop_index\n' +
        '    , stop_name\n' +
        '    , stop_lat\n' +
        '    , stop_lon\n' +
        'FROM [dbo].[stops]',
	getLastStopOnTrip: 'SELECT TOP(1) trip_id\n' +
        '\t, stop_id\n' +
        '\t, stop_sequence\n' +
        'FROM stop_times\n' +
        'WHERE trip_index = @trip_index\n' +
        'ORDER BY stop_sequence DESC',
	getRouteById: 'SELECT route_id\n' +
        '    , route_index\n' +
        '    , agency_id\n' +
        '    , route_short_name\n' +
        '    , route_long_name\n' +
        '    , route_type\n' +
        'FROM [dbo].[routes]\n' +
        'WHERE [route_id] = @routeId',
	getShapeById: 'SELECT shape_id\n' +
        '    , id\n' +
        '    , shape_pt_lat\n' +
        '    , shape_pt_lon\n' +
        '    , shape_pt_sequence\n' +
        '    , shape_dist_traveled\n' +
        'FROM [dbo].[shapes]\n' +
        'WHERE shape_id = @shapeId',
	getStopById: 'SELECT stop_id\n' +
        '    , stop_index\n' +
        '    , stop_name\n' +
        '    , stop_lat\n' +
        '    , stop_lon\n' +
        'FROM [dbo].[stops] \n' +
        'WHERE [stop_id] = @stopId',
	getStopTimesByTripId: 'SELECT trip_id\n' +
        '    , trip_index\n' +
        '    , arrival_time\n' +
        '    , arrival_timestamp\n' +
        '    , departure_time\n' +
        '    , departure_timestamp\n' +
        '    , stop_id\n' +
        '    , stop_index\n' +
        '    , stop_sequence\n' +
        '    , stop_headsign\n' +
        '    , pickup_type\n' +
        '    , drop_off_type\n' +
        '    , shape_dist_traveled\n' +
        'FROM [dbo].[stop_times]\n' +
        'WHERE trip_id = @tripId',
	getTransfersFromStopId: 'SELECT from_stop_id\n' +
        '    , to_stop_id\n' +
        '    , transfer_type\n' +
        '    , min_transfer_time\n' +
        'FROM [dbo].[transfers]\n' +
        'WHERE from_stop_id = @stopId',
	getTransfersToStopId: 'SELECT from_stop_id\n' +
        '    , to_stop_id\n' +
        '    , transfer_type\n' +
        '    , min_transfer_time\n' +
        'FROM [dbo].[transfers]\n' +
        'WHERE to_stop_id = @stopId',
	getTripById: 'SELECT trip_id\n' +
        '    , trip_index\n' +
        '    , route_id\n' +
        '    , service_id\n' +
        '    , trip_headsign\n' +
        '    , direction_id\n' +
        '    , shape_id\n' +
        'FROM [dbo].[trips]\n' +
        'WHERE trip_id = @tripId',
	friday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN ( \n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate \n' +
        '    AND [end_date] >= @currentDate \n' +
        '    AND friday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	monday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN (\n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate\n' +
        '    AND [end_date] >= @currentDate\n' +
        '    AND monday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	saturday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN ( \n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate \n' +
        '    AND [end_date] >= @currentDate \n' +
        '    AND saturday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	sunday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN ( \n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate \n' +
        '    AND [end_date] >= @currentDate \n' +
        '    AND sunday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	thursday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN ( \n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate \n' +
        '    AND [end_date] >= @currentDate \n' +
        '    AND thursday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	tuesday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN ( \n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate \n' +
        '    AND [end_date] >= @currentDate \n' +
        '    AND tuesday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	wednesday: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM stop_times st, trips t\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND [st].[trip_index] = [t].[trip_index]\n' +
        'AND [t].[service_id] IN ( \n' +
        '    SELECT [service_id]\n' +
        '    FROM calendar\n' +
        '    WHERE [start_date] <= @currentDate \n' +
        '    AND [end_date] >= @currentDate \n' +
        '    AND wednesday = 1\n' +
        '    UNION\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '    EXCEPT\n' +
        '    SELECT [service_id] FROM calendar_dates\n' +
        '    WHERE [date] = @currentDate AND [exception_type] = 2\n' +
        ')\n' +
        'AND [st].[departure_timestamp] >= @currentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	fridayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND friday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND saturday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	mondayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND monday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND tuesday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	saturdayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND saturday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND sunday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	sundayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND sunday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND monday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	thursdayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND thursday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND friday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	tuesdayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND tuesday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND wednesday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]',
	wednesdayNight: 'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @currentDate\n' +
        '\t\tAND [end_date] >= @currentDate\n' +
        '\t\tAND wednesday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @currentDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] >= @wrappedCurrentTimestampMinusNumMinutes\n' +
        'AND [st].[departure_timestamp] <= @wrappedCurrentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        '\n' +
        'UNION\n' +
        '\n' +
        'SELECT [t].[trip_id]\n' +
        '    , [t].[trip_index]\n' +
        '    , [t].[trip_headsign]\n' +
        '    , [t].[route_id]\n' +
        '    , [st].[stop_id]\n' +
        '    , [st].[stop_headsign]\n' +
        '    , [t].[service_id]\n' +
        '    , [t].[direction_id]\n' +
        '    , [st].[arrival_time]\n' +
        '    , [st].[arrival_timestamp]\n' +
        '    , [st].[departure_time]\n' +
        '    , [st].[departure_timestamp]\n' +
        '    , [st].[stop_sequence]\n' +
        '    , [t].[shape_id]\n' +
        '    , [st].[shape_dist_traveled]\n' +
        'FROM trips t, stop_times st\n' +
        'WHERE [st].[stop_index] = (\n' +
        '\tSELECT stop_index FROM stops WHERE stop_id = @stopId\n' +
        ')\n' +
        'AND st.trip_index = t.trip_index\n' +
        'AND t.service_id IN (\n' +
        '\tSELECT [service_id]\n' +
        '\t\tFROM calendar\n' +
        '\t\tWHERE [start_date] <= @nextDayDate\n' +
        '\t\tAND [end_date] >= @nextDayDate\n' +
        '\t\tAND thursday = 1\n' +
        '\t\tUNION\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 1\n' +
        '\t\tEXCEPT\n' +
        '\t\tSELECT [service_id] FROM calendar_dates\n' +
        '\t\tWHERE [date] = @nextDayDate AND [exception_type] = 2\n' +
        '\t)\n' +
        'AND [st].[departure_timestamp] <= @currentTimestampPlusOneHour\n' +
        'AND [st].[pickup_type] = 0\n' +
        'ORDER BY [st].[departure_timestamp]'
};

module.exports = { mockConfig, loadSqlQueriesResponseMock };
