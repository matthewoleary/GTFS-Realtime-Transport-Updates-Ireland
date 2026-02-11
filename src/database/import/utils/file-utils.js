import fs from 'fs-extra';
import { Extract } from 'unzipper';

/*
 * Attempt to parse the specified config JSON file.
 */
export async function getConfig(config) {
	try {
		const parsedConfig = JSON.parse(config);
		return parsedConfig;
	} catch (error) {
		console.error(new Error('Cannot parse configuration file. Check to ensure that it is valid JSON.'));
		throw error;
	}
}

/*
 * Prepare the specified directory for saving HTML timetables by deleting
 * everything.
 */
export async function prepDirectory(exportPath) {
	await fs.remove(exportPath);
	await fs.ensureDir(exportPath);
}

/*
 * Unzip a zipfile into a specified directory
 */
export function unzip(zipfilePath, exportPath) {
	/* eslint-disable new-cap */
	return fs.createReadStream(zipfilePath)
		.pipe(Extract({ path: exportPath }))
		.on('entry', entry => entry.autodrain())
		.promise();
	/* eslint-enable new-cap */
}
