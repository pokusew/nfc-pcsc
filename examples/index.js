"use strict";

// #############
// Basic example
// - example reading and writing data on from/to card
// - should work well with any compatible PC/SC card reader
// - tested with Mifare Ultralight cards but should work with many others
// - example authentication for Mifare Classic cards
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/index';
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

nfc.on('reader', async reader => {

	pretty.info(`device attached`, { reader: reader.name });

	readers.push(reader);

	// needed for reading tags emulated with Android HCE AID
	// see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
	reader.aid = 'F222222222';

	reader.on('card', async card => {


		// standard nfc tags like Mifare
		if (card.type === TAG_ISO_14443_3) {
			// const uid = card.uid;
			pretty.info(`card detected`, { reader: reader.name, card });
		}
		// Android HCE
		else if (card.type === TAG_ISO_14443_4) {
			// process raw Buffer data
			const data = card.data.toString('utf8');
			pretty.info(`card detected`, { reader: reader.name, card: { ...card, data } });
		}
		// not possible, just to be sure
		else {
			pretty.info(`card detected`, { reader: reader.name, card });
		}


		// Notice: reading data from Mifare Classic cards (e.g. Mifare 1K) requires,
		// that the data block must be authenticated first
		// don't forget to fill your keys and types
		// reader.authenticate(blockNumber, keyType, key, obsolete = false)
		// if you are experiencing problems, you can try using obsolete = true which is compatible with PC/SC V2.01
		// uncomment when you need it

		// try {
		//
		// 	const key = 'FFFFFFFFFFFF';
		// 	const keyType = KEY_TYPE_A;
		//
		// 	// we will authenticate block 4, ... (which we want to read)
		// 	await Promise.all([
		// 		reader.authenticate(4, keyType, key),
		// 		reader.authenticate(..., keyType, key),
		// 	]);
		//
		// 	pretty.info(`blocks successfully authenticated`);
		//
		// } catch (err) {
		// 	pretty.error(`error when authenticating data`, { reader: reader.name, card, err });
		// 	return;
		// }


		// example reading 16 bytes assuming containing 16bit integer
		// !!! note that we don't need 16 bytes – 16bit integer takes just 2 bytes !!!
		try {

			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// - blockSize - 4 for Mifare Ultralight, 16 for Mifare Classic
			// ! Caution! length must be divisible by blockSize
			// ! Caution! Mifare Classic cards have sector trailers
			//   containing access bits instead of data, each last block in sector is sector trailer
			//   (e.g. block 3, 7, 11, 14)
			//   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178

			const data = await reader.read(4, 16); // await reader.read(4, 16, 16); for Mifare Classic cards

			pretty.info(`data read`, { reader: reader.name, data });

			const payload = data.readInt16BE();

			pretty.info(`data converted`, payload);

		} catch (err) {
			pretty.error(`error when reading data`, { reader: reader.name, err });
		}


		// example write 16 bytes containing 16bit integer
		// !!! note that we don't need 16 bytes – 16bit integer takes just 2 bytes !!!
		try {

			// reader.write(blockNumber, data, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start writing
			// - data - what to write
			// - blockSize - 4 for Mifare Ultralight, 16 for Mifare Classic
			// ! Caution! data.length must be divisible by blockSize
			// ! Caution! Mifare Classic cards have sector trailers
			//   containing access bits instead of data, each last block in sector is sector trailer
			//   (e.g. block 3, 7, 11, 14)
			//   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178

			const data = Buffer.allocUnsafe(16);
			data.fill(0);
			const randomNumber = Math.round(Math.random() * 1000);
			data.writeInt16BE(randomNumber);

			await reader.write(4, data); // await reader.write(4, data, 16); for Mifare Classic cards

			pretty.info(`data written`, { reader: reader.name });

		} catch (err) {
			pretty.error(`error when writing data`, { reader: reader.name, err });
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
