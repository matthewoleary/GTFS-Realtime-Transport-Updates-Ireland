import { describe, expect, it, vi } from 'vitest';
import {
	createBulkImportStatement,
	importFileWithBulkLoader,
	isLocalInfileEnabled,
	supportsBulkImportFor,
} from '../bulk-import.js';

describe('GTFS bulk import', () => {
	it('only targets the two high-volume GTFS tables', () => {
		expect(supportsBulkImportFor({ filenameBase: 'shapes' })).toBe(true);
		expect(supportsBulkImportFor({ filenameBase: 'stop_times' })).toBe(true);
		expect(supportsBulkImportFor({ filenameBase: 'stops' })).toBe(false);
	});

	it('detects whether MySQL local infile support is enabled', async () => {
		const enabled = { query: vi.fn().mockResolvedValue([[{ Value: 'ON' }]]) };
		const disabled = { query: vi.fn().mockResolvedValue([[{ Value: 'OFF' }]]) };
		const unavailable = { query: vi.fn().mockRejectedValue(new Error('unsupported')) };

		await expect(isLocalInfileEnabled(enabled)).resolves.toBe(true);
		await expect(isLocalInfileEnabled(disabled)).resolves.toBe(false);
		await expect(isLocalInfileEnabled(unavailable)).resolves.toBe(false);
	});

	it('maps arbitrary CSV columns and calculates extended-hour stop timestamps', () => {
		const model = {
			filenameBase: 'stop_times',
			schema: [
				{ name: 'trip_id' },
				{ name: 'arrival_time' },
				{ name: 'departure_time' },
				{ name: 'stop_id' },
				{ name: 'arrival_timestamp' },
				{ name: 'departure_timestamp' },
			],
		};
		const statement = createBulkImportStatement([
			'trip_id', 'unused_gtfs_column', 'arrival_time', 'departure_time', 'stop_id',
		], model);

		expect(statement).toContain('LOAD DATA LOCAL INFILE ?');
		expect(statement).toContain('INTO TABLE `stop_times`');
		expect(statement).toContain('(@gtfs_field_0, @gtfs_field_1, @gtfs_field_2, @gtfs_field_3, @gtfs_field_4)');
		expect(statement).toContain('`trip_id` = NULLIF');
		expect(statement).not.toContain('`unused_gtfs_column` =');
		expect(statement).toContain('`arrival_timestamp` = IF(');
		expect(statement).toContain('* 3600');
		expect(statement).toContain('`departure_timestamp` = IF(');
	});

	it('returns MySQL affected rows from the native loader', async () => {
		const connection = { query: vi.fn().mockResolvedValue([{ affectedRows: 42 }]) };
		const model = { filenameBase: 'shapes', schema: [{ name: 'shape_id' }] };

		await expect(importFileWithBulkLoader(
			connection,
			'/tmp/shapes.txt',
			['shape_id'],
			model
		)).resolves.toBe(42);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining('LOAD DATA LOCAL INFILE ?'),
			['/tmp/shapes.txt']
		);
	});

	it('loads into a physical staging table when provided', () => {
		const statement = createBulkImportStatement(['shape_id'], {
			filenameBase: 'shapes',
			tableName: 'shapes_stage_test',
			schema: [{ name: 'shape_id' }],
		});

		expect(statement).toContain('INTO TABLE `shapes_stage_test`');
	});
});
