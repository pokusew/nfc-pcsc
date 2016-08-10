"use strict";

import winston from 'winston';
import NFC, { TAG_ISO_14443_3, TAG_ISO_14443_4 } from '../src/NFC';
import pretty from './pretty';


// minilogger for debugging
//
// function log() {
// 	console.log(...arguments);
// }
//
// const minilogger = {
// 	log: log,
// 	debug: log,
// 	info: log,
// 	warn: log,
// 	error: log
// };

const nfc = new NFC(); // const nfc = new NFC(minilogger); // optionally you can pass logger to see internal debug logs

let readers = [];

nfc.on('reader', reader => {

	pretty.info(`device attached`, {reader: reader.name});

	readers.push(reader);

	// needed for reading tags emulated with Android HCE AID
	// see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
	reader.aid = 'F222222222';

	reader.on('card', async card => {

		try {

			// example reading 16 bytes assuming containing 16bit integer

			const data = await reader.read(4, 16);

			pretty.info(`data read`, {reader: reader.name, card, data});

			const payload = data.readInt16BE();

			pretty.info(`data converted`, payload);
		} catch (err) {
			pretty.error(`error when reading data`, {reader: reader.name, card, err});
		}

		try {

			// example write 16bit integer

			const data = Buffer.allocUnsafe(16);
			data.writeInt16BE(789);

			await reader.write(4, data);

			pretty.info(`data written`, {reader: reader.name, card});

		} catch (err) {
			pretty.error(`error when writing data`, {reader: reader.name, card, err});
		}

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
