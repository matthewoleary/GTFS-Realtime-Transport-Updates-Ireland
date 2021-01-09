'use-strict';

const addCustomColumns = async task => {
	const request = task.cnx.request();
	try {
		const column = {
			name: 'route_index',
			type: 'integer',
			identity: true
		};
		await addCustomColumn(request, 'routes', column);
	} catch (error) {
		task.warn('Error adding route_index to routes');
		throw error;
	}

	try {
		const column = {
			name: 'stop_index',
			type: 'integer',
			identity: true
		};
		await addCustomColumn(request, 'stops', column);
	} catch (error) {
		task.warn('Error adding stop_index to stops');
		throw error;
	}

	try {
		const column = {
			name: 'trip_index',
			type: 'integer',
			identity: true
		};
		await addCustomColumn(request, 'trips', column);
	} catch (error) {
		task.warn('Error adding trip_index to trips');
		throw error;
	}

	try {
		const column = {
			name: 'route_index',
			type: 'integer',
			required: false
		};
		await addCustomColumn(request, 'trips', column);
	} catch (error) {
		task.warn('Error adding route_index to trips');
		throw error;
	}

	try {
		const column = {
			name: 'trip_index',
			type: 'integer',
			required: false
		};
		await addCustomColumn(request, 'stop_times', column);
	} catch (error) {
		task.warn('Error adding trip_index to stop_times');
		throw error;
	}

	try {
		const column = {
			name: 'stop_index',
			type: 'integer',
			required: false
		};
		await addCustomColumn(request, 'stop_times', column);
	} catch (error) {
		task.warn('Error adding stop_index to stop_times');
		throw error;
	}
};

const addCustomValues = async task => {
	const request = task.cnx.request();
	try {
		await request.query('UPDATE stop_times SET trip_index = (SELECT trip_index from trips WHERE stop_times.trip_id = trips.trip_id)');
	} catch (error) {
		task.warn('Error updating trip_index in stop_times');
		throw error;
	}

	try {
		await request.query('UPDATE stop_times SET stop_index = (SELECT stop_index from stops WHERE stop_times.stop_id = stops.stop_id)');
	} catch (error) {
		task.warn('Error updating stop_index in stop_times');
		throw error;
	}

	try {
		await request.query('UPDATE trips SET route_index = (SELECT route_index from routes WHERE trips.route_id = routes.route_id)');
	} catch (error) {
		task.warn('Error updating route_index in trips');
		throw error;
	}
};

const addCustomIndexes = async task => {
	const request = task.cnx.request();
	try {
		await request.query('DROP INDEX IF EXISTS routes.idx_routes_route_index');
		await request.query('CREATE INDEX idx_routes_route_index ON routes (route_index);');
	} catch (error) {
		task.warn('Error creating index idx_routes_route_index on routes');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS routes.idx_routes_agency_id');
		await request.query('CREATE INDEX idx_routes_agency_id ON routes (agency_id);');
	} catch (error) {
		task.warn('Error creating index idx_routes_agency_id on routes');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS stops.idx_stops_stop_index');
		await request.query('CREATE INDEX idx_stops_stop_index ON stops (stop_index);');
	} catch (error) {
		task.warn('Error creating index idx_stops_stop_index on stops');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS stops.idx_stops_stop_id');
		await request.query('CREATE INDEX idx_stops_stop_id ON stops (stop_id);');
	} catch (error) {
		task.warn('Error creating index idx_stops_stop_id on stops');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS trips.idx_trips_trip_index');
		await request.query('CREATE INDEX idx_trips_trip_index ON trips (trip_index);');
	} catch (error) {
		task.warn('Error creating index idx_trips_trip_index on trips');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS trips.idx_trips_route_index');
		await request.query('CREATE INDEX idx_trips_route_index ON trips (route_index);');
	} catch (error) {
		task.warn('Error creating index idx_trips_route_index on trips');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS stop_times.idx_stop_times_trip_index');
		await request.query('CREATE INDEX idx_stop_times_trip_index ON stop_times (trip_index);');
	} catch (error) {
		task.warn('Error creating index idx_stop_times_trip_index on stop_times');
		throw error;
	}

	try {
		await request.query('DROP INDEX IF EXISTS stop_times.idx_stop_times_stop_index');
		await request.query('CREATE INDEX idx_stop_times_stop_index ON stop_times (stop_index);');
	} catch (error) {
		task.warn('Error creating index idx_stop_times_stop_index on stop_times');
		throw error;
	}
};

const addCustomColumn = async (request, table, column) => {
	const identity = column.identity ? 'IDENTITY(1,1)' : '';
	const required = column.required ? 'NOT NULL' : '';
	try {
		await request.query(`
            IF NOT EXISTS (
                SELECT
                *
                FROM
                INFORMATION_SCHEMA.COLUMNS
                WHERE
                TABLE_NAME = '${table}' AND COLUMN_NAME = '${column.name}'
            )
            BEGIN
            ALTER TABLE ${table}
                ADD ${column.name} ${column.type} ${required} ${identity}
            END
        `);
	} catch (error) {
		throw error;
	}
};

module.exports = {
	addCustomColumns,
	addCustomValues,
	addCustomIndexes
};
