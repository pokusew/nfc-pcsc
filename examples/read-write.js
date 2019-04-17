"use strict";

// #############
// Example: Reading and writing data
// - should work well with any compatible PC/SC card reader
// - tested with MIFARE Ultralight cards but should work with many others (e.g. NTAG)
// - what is covered:
//   - example reading and writing data on from/to card
// - NOTE! for reading and writing data from/to MIFARE Classic please see examples/mifare-classic.js which explains MIFARE Classic specifics
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/index';
import pretty from './pretty-logger';


const nfc = new NFC(); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs

nfc.on('reader', async reader => {

	pretty.info(`device attached`, reader);

	// enable when you want to auto-process ISO 14443-4 tags (standard=TAG_ISO_14443_4)
	// when an ISO 14443-4 is detected, SELECT FILE command with the AID is issued
	// the response is available as card.data in the card event
	// you can set reader.aid to:
	// 1. a HEX string (which will be parsed automatically to Buffer)
	reader.aid = 'F222222222';
	// 2. an instance of Buffer containing the AID bytes
	// reader.aid = Buffer.from('F222222222', 'hex');
	// 3. a function which must return an instance of a Buffer when invoked with card object (containing standard and atr)
	//    the function may generate AIDs dynamically based on the detected card
	// reader.aid = ({ standard, atr }) => {
	//
	// 	return Buffer.from('F222222222', 'hex');
	//
	// };

	reader.on('card', async card => {

		pretty.info(`card detected`, reader, card);

		// example reading 4 bytes assuming containing 16bit integer
		// !!! note that we don't need 4 bytes - 16bit integer takes just 2 bytes !!!
		try {

			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
			// ! Caution! length must be divisible by blockSize (we have to read the whole block(s))

			const data = await reader.read(4, 4);

			pretty.info(`data read`, reader, data);

			const payload = data.readInt16BE(0);

			pretty.info(`data converted`, reader, payload);

		} catch (err) {
			pretty.error(`error when reading data`, reader, err);
		}


		// example write 4 bytes containing 16bit integer
		// !!! note that we don't need 16 bytes - 16bit integer takes just 2 bytes !!!
		try {

			// reader.write(blockNumber, data, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start writing
			// - data - what to write
			// - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
			// ! Caution! data.length must be divisible by blockSize (we have to write the whole block(s))

			const data = Buffer.allocUnsafe(4).fill(0);
			const randomNumber = Math.round(Math.random() * 1000);
			data.writeInt16BE(randomNumber, 0);

			await reader.write(4, data);

			pretty.info(`data written`, reader, randomNumber, data);

		} catch (err) {
			pretty.error(`error when writing data`, reader, err);
		}


	});

	reader.on('error', err => {
		pretty.error(`an error occurred`, reader, err);
	});

	reader.on('end', () => {
		pretty.info(`device removed`, reader);
	});


});

nfc.on('error', err => {
	pretty.error(`an error occurred`, err);
});
