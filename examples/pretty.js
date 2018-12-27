"use strict";

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

const printf = winston.format.printf(({ timestamp, level, message, [SPLAT]: splat }) => {

	let splatString = '';

	if (splat) {
		splatString = ' ' + (splat.length > 1 ? util.inspect(splat, { colors: true }) : util.inspect(splat[0], { colors: true }));
	}

	// see https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object
	return `${timestamp ? timestamp + ' – ' : ''}${level}: ${message}${splatString}`;

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
