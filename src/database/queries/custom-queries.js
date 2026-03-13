
/**
 * Adds departure_timestamp and arrival_timestamp columns to the stop_times table and updates the model schema.
 *
 * @param {Object} task - The task object containing database connection and logging functions.
 * @param {Object} model - The model object whose schema will be updated with new columns.
 * @returns {Promise<void>} Resolves when columns are added and schema is updated.
 * @throws Will throw an error if the query fails.
 */
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

/**
 * Adds custom columns to a specified table in the database.
 *
 * @param {Object} task - The task object containing database connection and logging functions.
 * @param {string} table - The name of the table to modify.
 * @param {Array<Object>} columns - Array of column definitions to add.
 * @returns {Promise<void>} Resolves when all columns are added.
 * @throws Will throw an error if any query fails.
 */
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

/**
 * Adds the feed_last_updated column to the feed_info table.
 *
 * Note: This will throw an error if the column already exists.
 *
 * @param {Object} task - The task object containing database connection and logging functions.
 * @returns {Promise<void>} Resolves when the column is added.
 * @throws Will throw an error if the query fails or the column already exists.
 */
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

/**
 * Updates the feed_last_updated column in the feed_info table to the current time.
 *
 * @param {Object} task - The task object containing database connection and logging functions.
 * @returns {Promise<void>} Resolves when the update is complete.
 * @throws Will throw an error if the query fails.
 */
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