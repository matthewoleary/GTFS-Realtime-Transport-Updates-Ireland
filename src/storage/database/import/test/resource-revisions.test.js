import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import {
	calculateResourceRevisions,
	hasCompleteResourceRevisions,
	saveResourceRevisions,
} from '../resource-revisions.js';

describe('resource revisions', () => {
	it('is stable across file discovery order and scopes changes to dependent resources', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'gtfs-revisions-'));
		await writeFile(join(directory, 'agency.txt'), 'agency');
		await writeFile(join(directory, 'routes.txt'), 'routes');
		await writeFile(join(directory, 'stops.txt'), 'stops');
		await writeFile(join(directory, 'trips.txt'), 'trips');
		await writeFile(join(directory, 'stop_times.txt'), 'stop times');

		const first = await calculateResourceRevisions(directory, [
			'stops.txt', 'agency.txt', 'stop_times.txt', 'routes.txt', 'trips.txt',
		]);
		const reordered = await calculateResourceRevisions(directory, [
			'trips.txt', 'routes.txt', 'stop_times.txt', 'agency.txt', 'stops.txt',
		]);
		expect(reordered).toEqual(first);

		await writeFile(join(directory, 'stops.txt'), 'changed stops');
		const changed = await calculateResourceRevisions(directory, [
			'agency.txt', 'routes.txt', 'stops.txt', 'stop_times.txt', 'trips.txt',
		]);
		expect(changed.stops).not.toBe(first.stops);
		expect(changed.routes).toBe(first.routes);
		expect(changed.agencies).toBe(first.agencies);
	});

	it('creates and upserts the revision metadata table', async () => {
		const connection = { query: vi.fn().mockResolvedValue() };
		await saveResourceRevisions(connection, { stops: 'a'.repeat(64) });

		expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS resource_revisions'));
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining('INSERT INTO resource_revisions'),
			[[['stops', 'a'.repeat(64)]]],
		);
		expect(connection.query.mock.calls[1][0]).toContain('INSERT INTO resource_revisions (resource_name, revision)');
		expect(connection.query.mock.calls[1][0]).toContain('CURRENT_TIMESTAMP');
	});

	it('detects missing and complete resource revision metadata', async () => {
		const missingTable = { query: vi.fn().mockResolvedValue([[{ count: 0 }]]) };
		await expect(hasCompleteResourceRevisions(missingTable)).resolves.toBe(false);

		const complete = {
			query: vi.fn()
				.mockResolvedValueOnce([[{ count: 1 }]])
				.mockResolvedValueOnce([[{ count: 6 }]]),
		};
		await expect(hasCompleteResourceRevisions(complete)).resolves.toBe(true);
	});
});
