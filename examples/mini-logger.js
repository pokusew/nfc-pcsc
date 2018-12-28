"use strict";

// mini-logger for debugging

function log() {
	console.log(...arguments);
}

const logger = {
	log: log,
	debug: log,
	info: log,
	warn: log,
	error: log,
};

export default logger;
