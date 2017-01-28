"use strict";

import winston from 'winston';
import util from 'util';
import chalk from 'chalk';
import prettyjson from 'prettyjson';


const prettyjsonOptions = {
	keysColor: 'cyan',
	dashColor: 'magenta',
	stringColor: 'gray'
};

function json(data) {
	return prettyjson.render(data, prettyjsonOptions);
}

const logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			level: 'silly',
			timestamp: function () {
				return (new Date).toLocaleTimeString();
			},
			formatter: formatConsoleLog
		})
	]
});

function formatLevel(level) {

	switch (level) {

		case 'info':
			return chalk.green(level);

		case 'error':
			return chalk.red(level);

		default:
			return level;

	}

}

function formatConsoleLog(options) {

	const time = chalk.gray(options.timestamp());
	const level = ' ' + formatLevel(options.level);
	const reader = options.meta.reader ? ' ' + chalk.yellow(options.meta.reader) : '';


	if (options.meta.reader) {
		delete options.meta.reader;
	}

	let log = time + level + reader + '  '
		+ (options.message !== undefined ? options.message : '')
		+ (options.meta && Object.keys(options.meta).length ? '\n' + json(options.meta) : '' );

	return log;

}

export default logger;
