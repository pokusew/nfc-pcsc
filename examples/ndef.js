"use strict";

// #############
// example not finished, it in progress !!!
// Read NDEF formatted data
// #############

import NFC, { TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/NFC';
import pretty from './pretty';



// https://github.com/don/ndef-js
const ndef = require('ndef');


const nfc = new NFC(); // const nfc = new NFC(minilogger); // optionally you can pass logger to see internal debug logs

let readers = [];

nfc.on('reader', async reader => {

	pretty.info(`device attached`, { reader: reader.name });

	readers.push(reader);

	reader.on('card', async card => {

		// standard nfc tags like Mifare
		if (!card.type === TAG_ISO_14443_3) {
			return;
		}

		pretty.info(`card detected`, { reader: reader.name, card });

		try {

			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// ! Caution! length must be divisible by blockSize

			const data = await reader.read(4, 48);

			console.log(ndef.decodeMessage(data.toJSON().data));


		} catch (err) {
			console.log(err);
			pretty.error(`error when reading data`, { reader: reader.name, card, err });
		}

	});

	reader.on('error', err => {

		pretty.error(`an error occurred`, { reader: reader.name, err });

	});

	reader.on('end', () => {

		pretty.info(`device removed`, { reader: reader.name });

		delete readers[readers.indexOf(reader)];

		console.log(readers);

	});


});

nfc.on('error', err => {

	pretty.error(`an error occurred`, err);

});
