"use strict";

import winston from 'winston';
import NFC from '../src/NFC';

const logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			//level: 'error'
		})
	]
});

logger.cli();

const nfc = new NFC(logger);

let readers = [];

nfc.on('reader', reader => {

	console.log(`NFC (${reader.reader.name}): device attached`);

	readers.push(reader);

	console.log(readers);

	reader.on('card', card => {

		// card uid is hex string
		console.log(`NFC (${reader.reader.name}): card detected`, card.uid);

	});

	reader.on('error', err => {

		console.log(`NFC (${reader.reader.name}): an error occurred`, err);

	});

	reader.on('end', () => {

		console.log(`NFC (${reader.reader.name}): device removed`);

		delete readers[readers.indexOf(reader)];

		console.log(readers);

	});

});

nfc.on('error', err => {

	console.log('NFC: an error occurred', err);

});