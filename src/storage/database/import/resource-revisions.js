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
const REQUIRED_RESOURCES = ['schedule', ...Object.keys(RESOURCE_FILES)];

async function hashFile(filePath) {
	const hash = createHash('sha256');
	for await (const chunk of createReadStream(filePath)) {
		hash.update(chunk);
	}

	return hash.digest('hex');
}

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

	return Object.fromEntries(Object.entries(resources).map(([resourceName, filenames]) => {
		const hash = createHash('sha256');
		for (const filename of filenames) {
			hash.update(filename);
			hash.update('\0');
			hash.update(fileRevisions.get(filename));
			hash.update('\0');
		}

		return [resourceName, hash.digest('hex')];
	}));
}

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

export async function hasCompleteResourceRevisions(connection) {
	const [tables] = await connection.query(`
		SELECT COUNT(*) AS count
		FROM information_schema.tables
		WHERE table_schema = DATABASE()
			AND table_name = 'resource_revisions'
	`);
	if (Number(tables[0].count) === 0) {
		return false;
	}

	const [rows] = await connection.query(`
		SELECT COUNT(*) AS count
		FROM resource_revisions
		WHERE resource_name IN (?)
	`, [REQUIRED_RESOURCES]);
	return Number(rows[0].count) === REQUIRED_RESOURCES.length;
}

export { REQUIRED_RESOURCES, RESOURCE_FILES };
