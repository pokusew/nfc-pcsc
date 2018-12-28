"use strict";

// pretty-logger for debugging
// uses great winston logger library, visit https://github.com/winstonjs/winston

import util from 'util';
import chalk from 'chalk';
import winston from 'winston';
import { SPLAT } from 'triple-beam';


const colors = {
	exception: 'red',
	error: 'red',
	warn: 'yellow',
	info: 'green',
	verbose: 'blue',
	debug: 'blue',
	silly: 'gray',
};

winston.addColors(colors);

// we could use instanceof but to avoid import we simply check obj structure
const isReader = obj => typeof obj === 'object' && obj.reader && obj.name;

const printf = winston.format.printf(({ timestamp, level, message, [SPLAT]: splat }) => {

	let splatString = '';

	let reader = '';

	if (splat) {

		let readerObj = splat.find(isReader);

		if (readerObj) {
			reader = chalk.cyan(readerObj.name) + ' ';
			splat = splat.filter(obj => !isReader(obj));
		}

		if (splat.length > 1) {
			splatString = ' ' + util.inspect(splat, { colors: true });
		}
		else if (splat.length > 0) {
			splatString = ' ' + util.inspect(splat[0], { colors: true });
		}

	}

	// see https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object
	return `${timestamp ? timestamp + ' – ' : ''}${reader}${level}: ${message}${splatString}`;

});

const FORMAT = winston.format.combine(
	winston.format.timestamp({
		format: () => chalk.gray(new Date().toLocaleTimeString()),
	}),
	winston.format.colorize(),
	printf,
);

const logger = winston.createLogger({
	transports: [
		new (winston.transports.Console)({
			level: 'silly',
			format: FORMAT,
		}),
	],
	exitOnError: true,

});


export default logger;
