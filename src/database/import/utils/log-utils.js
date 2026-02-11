import { clearLine, cursorTo } from 'node:readline';
import _ from 'lodash';
import chalk from 'chalk';
const { red, yellow } = chalk;
/*
 * Returns a log function based on config settings
 */
export function log(config) {
	if (config.verbose === false) {
		return noop;
	}

	if (config.logFunction) {
		return config.logFunction;
	}

	return (text, overwrite) => {
		if (overwrite === true) {
			clearLine(process.stdout, 0);
			cursorTo(process.stdout, 0);
		} else {
			process.stdout.write('\n');
		}

		process.stdout.write(text);
	};
}

/*
 * Returns an warning log function based on config settings
 */
export function logWarning(config) {
	if (config.logFunction) {
		return config.logFunction;
	}

	return text => {
		process.stdout.write(`\n${formatWarning(text)}\n`);
	};
}

/*
 * Returns an error log function based on config settings
 */
export function logError(config) {
	if (config.logFunction) {
		return config.logFunction;
	}

	return text => {
		process.stdout.write(`\n${formatError(text)}\n`);
	};
}

/*
 * Format console warning text
 */
export function formatWarning(text) {
	return `${yellow.underline('Warning')}${yellow(':')} ${yellow(text)}`;
}

/*
 * Format console error text
 */
export function formatError(error) {
	return `${red.underline('Error')}${red(':')} ${red(error.message.replace('Error: ', ''))}`;
}
