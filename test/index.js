"use strict";

import winston from 'winston';
import NFC, { TAG_ISO_14443_3, TAG_ISO_14443_4 } from '../src/NFC';
import pretty from './pretty';

// logger to see debug logs from nfc-pcsc module
const logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			level: 'silly'
		})
	]
});
logger.cli(); // better style of logs


const nfc = new NFC();

let readers = [];

nfc.on('reader', reader => {

	pretty.info(`device attached`, {reader: reader.name});

	readers.push(reader);

	// needed for reading tags emulated with Android HCE AID
	// see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
	reader.aid = 'F222222222';

	reader.on('card', card => {

		// standard nfc tags like Mifare
		if (card.type === TAG_ISO_14443_3) {
			// uid
			const uid = card.uid;
			pretty.info(`card detected`, {reader: reader.name, card});
			return;
		}

		// Android HCE
		if (card.type === TAG_ISO_14443_4) {
			// process raw Buffer data
			const data = card.data.toString('utf8');
			pretty.info(`card detected`, {reader: reader.name, card: {...card, data}});
			return;
		}

		pretty.info(`card detected`, {reader: reader.name, card});

	});

	reader.on('error', err => {

		pretty.error(`an error occurred`, {reader: reader.name, err});

	});

	reader.on('end', () => {

		pretty.info(`device removed`, {reader: reader.name});

		delete readers[readers.indexOf(reader)];

		console.log(readers);

	});


});

nfc.on('error', err => {

	pretty.error(`an error occurred`, err);

});
