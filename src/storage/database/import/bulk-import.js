const BULK_IMPORT_TABLES = new Set(['shapes', 'stop_times']);

/**
 * Build a SQL expression that removes a trailing carriage return and converts
 * an empty GTFS field to NULL.
 * @param {string} variableName - MySQL user variable containing the CSV value.
 * @returns {string} SQL expression for the normalized value.
 */
function createNullIfEmptyCsvFieldExpression(variableName) {
	return `NULLIF(TRIM(TRAILING '\\r' FROM ${variableName}), '')`;
}

/**
 * Convert a GTFS HH:MM:SS value to seconds since the start of its service day.
 * GTFS hours may exceed 23, so MySQL TIME conversion cannot be used safely.
 * @param {string} variableName - MySQL user variable containing the GTFS time.
 * @returns {string} SQL expression that produces the timestamp value.
 */
function timestampExpression(variableName) {
	const value = createNullIfEmptyCsvFieldExpression(variableName);
	return `IF(${value} IS NULL, NULL, `
		+ `(CAST(SUBSTRING_INDEX(${value}, ':', 1) AS UNSIGNED) * 3600) + `
		+ `(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(${value}, ':', 2), ':', -1) AS UNSIGNED) * 60) + `
		+ `CAST(SUBSTRING_INDEX(${value}, ':', -1) AS UNSIGNED))`;
}

/**
 * Determine whether a model is approved for native MySQL bulk loading.
 * @param {object} model - GTFS model containing a filenameBase property.
 * @returns {boolean} Whether the model can use LOAD DATA LOCAL INFILE.
 */
export function supportsBulkImportFor(model) {
	return BULK_IMPORT_TABLES.has(model.filenameBase);
}

/**
 * Check whether the connected MySQL server permits local infile loading.
 * Query failures are treated as lack of support so the importer can fall back
 * to batched inserts.
 * @param {object} connection - MySQL connection or pool with a query method.
 * @returns {Promise<boolean>} Whether local_infile is enabled.
 */
export async function isLocalInfileEnabled(connection) {
	try {
		const [rows] = await connection.query("SHOW VARIABLES LIKE 'local_infile'");
		return rows[0]?.Value?.toUpperCase() === 'ON';
	} catch {
		return false;
	}
}

/**
 * Create a parameterized LOAD DATA LOCAL INFILE statement for a GTFS model.
 * Source fields are loaded into MySQL variables before normalization and model
 * column assignment. Stop times also receive derived service-day timestamps.
 * @param {string[]} fileColumns - Column names from the GTFS CSV header.
 * @param {object} model - Filtered GTFS model and its physical table name.
 * @returns {string} SQL statement whose first parameter is the source path.
 */
export function createBulkImportStatement(fileColumns, model) {
	const tableName = model.tableName || model.filenameBase;
	const sourceVariables = fileColumns.map((_, index) => `@gtfs_field_${index}`);
	const sourceVariableByColumn = new Map(
		fileColumns.map((column, index) => [column, sourceVariables[index]])
	);
	const assignments = model.schema
		.filter(column => sourceVariableByColumn.has(column.name))
		.map(column => `\`${column.name}\` = ${createNullIfEmptyCsvFieldExpression(sourceVariableByColumn.get(column.name))}`);

	if (model.filenameBase === 'stop_times') {
		const arrivalTime = sourceVariableByColumn.get('arrival_time');
		const departureTime = sourceVariableByColumn.get('departure_time');
		if (arrivalTime) assignments.push(`\`arrival_timestamp\` = ${timestampExpression(arrivalTime)}`);
		if (departureTime) assignments.push(`\`departure_timestamp\` = ${timestampExpression(departureTime)}`);
	}

	return `LOAD DATA LOCAL INFILE ?
INTO TABLE \`${tableName}\`
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\\n'
IGNORE 1 LINES
(${sourceVariables.join(', ')})
SET ${assignments.join(',\n    ')}`;
}

/**
 * Import a GTFS text file with MySQL's native bulk loader.
 * @param {object} connection - MySQL connection or pool with a query method.
 * @param {string} filePath - Absolute path to the extracted GTFS text file.
 * @param {string[]} fileColumns - Column names from the file header.
 * @param {object} model - Filtered GTFS model and destination table metadata.
 * @returns {Promise<number>} Number of rows reported as affected by MySQL.
 */
export async function importFileWithBulkLoader(connection, filePath, fileColumns, model) {
	const statement = createBulkImportStatement(fileColumns, model);
	const [result] = await connection.query(statement, [filePath]);
	return result.affectedRows ?? 0;
}

export { BULK_IMPORT_TABLES };
