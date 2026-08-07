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
	loadResourceRevisions,
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
		expect(changed['file:stops.txt']).not.toBe(first['file:stops.txt']);
		expect(changed['file:routes.txt']).toBe(first['file:routes.txt']);
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
		const missingTable = {
			query: vi.fn().mockRejectedValue(Object.assign(new Error('missing'), {
				code: 'ER_NO_SUCH_TABLE',
			})),
		};
		await expect(hasCompleteResourceRevisions(missingTable)).resolves.toBe(false);

		const revisions = [
			'schedule', 'agencies', 'routes', 'shapes', 'stops', 'trips',
			'file:agency.txt', 'file:calendar.txt', 'file:calendar_dates.txt',
			'file:feed_info.txt', 'file:routes.txt', 'file:shapes.txt',
			'file:stops.txt', 'file:stop_times.txt', 'file:trips.txt',
		].map(resource_name => ({ resource_name, revision: 'abc' }));
		const complete = {
			query: vi.fn().mockResolvedValue([revisions]),
		};
		await expect(hasCompleteResourceRevisions(complete)).resolves.toBe(true);

		const incomplete = {
			query: vi.fn().mockResolvedValue([revisions.slice(1)]),
		};
		await expect(hasCompleteResourceRevisions(incomplete)).resolves.toBe(false);
	});

	it('loads stored revisions and treats a missing metadata table as empty', async () => {
		const connection = {
			query: vi.fn().mockResolvedValue([[
				{ resource_name: 'file:stops.txt', revision: 'abc' },
			]]),
		};
		await expect(loadResourceRevisions(connection)).resolves.toEqual({
			'file:stops.txt': 'abc',
		});

		const missing = {
			query: vi.fn().mockRejectedValue(Object.assign(new Error('missing'), {
				code: 'ER_NO_SUCH_TABLE',
			})),
		};
		await expect(loadResourceRevisions(missing)).resolves.toEqual({});
	});
});
