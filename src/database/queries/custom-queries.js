'use-strict';

export const addCustomTimestampColumns = async (task, model) => {
	try {
		const departureTimestamp = {
			name: 'departure_timestamp',
			type: 'integer',
			required: false,
			index: true,
			after: 'departure_time'
		};
		const arrivalTimestamp = {
			name: 'arrival_timestamp',
			type: 'integer',
			required: false,
			after: 'arrival_time'
		};
		await addCustomColumns(task, 'stop_times', [departureTimestamp, arrivalTimestamp]);
		// add columns to model schema
		model.schema.push(departureTimestamp);
		model.schema.push(arrivalTimestamp);
	} catch (error) {
		task.warn('Error adding columns to stop_times table');
		throw error;
	}

};


export const addCustomColumns = async (task, table, columns) => {
	for (const column of columns) {
		const identity = column.identity ? 'AUTO_INCREMENT' : '';
		const required = column.required ? 'NOT NULL' : '';
		let position = '';
		if (column.first) {
			position = ' FIRST';
		} else if (column.after) {
			position = ` AFTER ${column.after}`;
		}
		try {
			await task.cnx.query(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.type} ${required} ${identity}${position}`);
		} catch (error) {
			throw error;
		}
	}
};

export const addFeedInfoLastUpdatedColumn = async task => {
	try {
		const column = {
			name: 'feed_last_updated',
			type: 'DATETIME',
			required: false
		};
		await task.cnx.query(`ALTER TABLE feed_info ADD ${column.name} ${column.type} ${column.required ? 'NOT NULL' : ''}`);
	} catch (error) {
		task.warn('Error adding feed_last_updated to feed_info');
		throw error;
	}
};

export const updateFeedInfoLastUpdatedValues = async task => {
	try {
		await task.cnx.query(`
			UPDATE feed_info
			SET feed_last_updated = NOW()
			WHERE feed_last_updated IS NULL OR feed_last_updated < NOW()
		`);
	} catch (error) {
		task.warn('Error updating feed_last_updated in feed_info');
		throw error;
	}
};