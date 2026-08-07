import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';

const RESOURCE_FILES = {
	agencies: ['agency.txt'],
	routes: ['agency.txt', 'routes.txt'],
	shapes: ['shapes.txt'],
	stops: ['routes.txt', 'stops.txt', 'stop_times.txt', 'trips.txt'],
	trips: ['calendar.txt', 'calendar_dates.txt', 'routes.txt', 'stop_times.txt', 'trips.txt'],
};
const TABLE_SOURCE_FILES = {
	agency: 'agency.txt',
	calendar: 'calendar.txt',
	calendar_dates: 'calendar_dates.txt',
	feed_info: 'feed_info.txt',
	routes: 'routes.txt',
	shapes: 'shapes.txt',
	stops: 'stops.txt',
	stop_times: 'stop_times.txt',
	trips: 'trips.txt',
};
const REQUIRED_RESOURCES = [
	'schedule',
	...Object.keys(RESOURCE_FILES),
	...Object.values(TABLE_SOURCE_FILES).map(filename => `file:${filename}`),
];

/**
 * Calculate a SHA-256 digest for a file without loading the whole file into
 * memory.
 * @param {string} filePath - Absolute path to the file to hash.
 * @returns {Promise<string>} Lowercase hexadecimal SHA-256 digest.
 */
async function hashFile(filePath) {
	const hash = createHash('sha256');
	for await (const chunk of createReadStream(filePath)) {
		hash.update(chunk);
	}

	return hash.digest('hex');
}

/**
 * Calculate deterministic revisions for an extracted GTFS schedule.
 *
 * The result contains a revision for every discovered file, the complete
 * schedule, and each public API resource defined in RESOURCE_FILES. Aggregate
 * revisions include both filenames and file digests so file boundaries cannot
 * produce ambiguous hashes.
 * @param {string} downloadDirectory - Directory containing extracted GTFS files.
 * @param {string[]} availableFiles - GTFS filenames discovered in the directory.
 * @returns {Promise<Record<string, string>>} Resource names mapped to SHA-256 revisions.
 */
export async function calculateResourceRevisions(downloadDirectory, availableFiles) {
	const available = new Set(availableFiles);
	const filenames = [...available].sort((left, right) => left.localeCompare(right));
	const revisionEntries = await Promise.all(filenames.map(async filename => [
		filename,
		await hashFile(join(downloadDirectory, filename)),
	]));
	const fileRevisions = new Map(revisionEntries);

	const resources = {
		schedule: filenames,
	};
	for (const [resourceName, filenames] of Object.entries(RESOURCE_FILES)) {
		resources[resourceName] = filenames.filter(filename => available.has(filename));
	}

	const resourceRevisions = Object.fromEntries(Object.entries(resources).map(([resourceName, filenames]) => {
		const hash = createHash('sha256');
		for (const filename of filenames) {
			hash.update(filename);
			hash.update('\0');
			hash.update(fileRevisions.get(filename));
			hash.update('\0');
		}

		return [resourceName, hash.digest('hex')];
	}));
	for (const [filename, revision] of fileRevisions) {
		resourceRevisions[`file:${filename}`] = revision;
	}
	return resourceRevisions;
}

/**
 * Create the revision metadata table when necessary and upsert calculated
 * revisions. updated_at advances only when a resource's digest changes.
 * @param {object} connection - MySQL connection or pool with a query method.
 * @param {Record<string, string>} revisions - Resource names mapped to revisions.
 * @returns {Promise<void>}
 */
export async function saveResourceRevisions(connection, revisions) {
	await connection.query(`
		CREATE TABLE IF NOT EXISTS resource_revisions (
			resource_name VARCHAR(64) PRIMARY KEY,
			revision CHAR(64) NOT NULL,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	const values = Object.entries(revisions).map(([resourceName, revision]) => [resourceName, revision]);
	if (values.length === 0) {
		return;
	}

	await connection.query(`
		INSERT INTO resource_revisions (resource_name, revision)
		VALUES ?
		ON DUPLICATE KEY UPDATE
			updated_at = IF(revision <> VALUES(revision), CURRENT_TIMESTAMP, updated_at),
			revision = VALUES(revision)
	`, [values]);
}

/**
 * Check whether revision metadata includes every entry needed for incremental
 * imports and resource-specific HTTP validators.
 * @param {object} connection - MySQL connection or pool with a query method.
 * @returns {Promise<boolean>} Whether all required revisions are present.
 */
export async function hasCompleteResourceRevisions(connection) {
	const revisions = await loadResourceRevisions(connection);
	return REQUIRED_RESOURCES.every(resourceName => Object.hasOwn(revisions, resourceName));
}

/**
 * Load saved resource revisions as a name-to-digest object. A missing metadata
 * table represents a pre-migration database and is returned as an empty object;
 * other database errors are propagated.
 * @param {object} connection - MySQL connection or pool with a query method.
 * @returns {Promise<Record<string, string>>} Stored revisions, or an empty object.
 */
export async function loadResourceRevisions(connection) {
	try {
		const [rows] = await connection.query(`
			SELECT resource_name, revision
			FROM resource_revisions
		`);
		return Object.fromEntries(rows.map(row => [row.resource_name, row.revision]));
	} catch (error) {
		if (error.code === 'ER_NO_SUCH_TABLE') return {};
		throw error;
	}
}

export { REQUIRED_RESOURCES, RESOURCE_FILES, TABLE_SOURCE_FILES };
