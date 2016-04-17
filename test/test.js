"use strict";

import winston from 'winston';
import NFC from './src/NFC';

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

	readers.push(reader);

	console.log(readers);

	reader.on('card', card => {

		// card uid is hex string
		console.log('card detected', card.uid);

	});

	reader.on('end', () => {

		delete readers[readers.indexOf(reader)];

		console.log(readers);

	});

});
