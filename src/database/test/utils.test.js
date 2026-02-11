/* eslint-env mocha */
// Mocha API
import { describe, it } from 'mocha';
// Assertions module - chai
import { assert } from 'chai';

// The code under test
import utils from '../utils';

/**
 * Tests - Data Utils functions:
 */
describe('Data Utils functions:', () => {
	describe('loadSqlQueries', () => {
		const { loadSqlQueries } = utils;
		const { loadSqlQueriesResponseMock } = require('./mocks').default;
		describe('when I call loadSqlQueries with folderName queries', () => {
			it('should return a queries object with each query and its corresponding SQL query', async () => {
				const sqlQueries = await loadSqlQueries('queries');
				assert.deepEqual(sqlQueries, loadSqlQueriesResponseMock);
			});
		});
	});

	describe('is_dir', () => {
		const { _testIsDir } = utils;
		const { join } = require('path');
		describe('when I call is_dir with folderName queries', () => {
			it('should return true', () => {
				const path = join(process.cwd(), 'src', 'data', 'queries');
				assert.isTrue(_testIsDir(path));
			});
		});
	});

	describe('is_dir', () => {
		const { _testIsDir } = utils;
		const { join } = require('path');
		describe('when I call is_dir with folderName hello', () => {
			it('should return false', () => {
				const path = join(process.cwd(), 'src', 'data', 'hello');
				assert.isFalse(_testIsDir(path));
			});
		});
	});
});
