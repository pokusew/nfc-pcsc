"use strict";

// #############
// ACR122U example controlling LED and buzzer
// - custom buzzer output
// - repeated beeping on unsuccessful read/write operation
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B, CONNECT_MODE_DIRECT } from '../src/index';
import pretty from './pretty';


// minilogger for debugging

function log() {
	console.log(...arguments);
}

const minilogger = {
	log: log,
	debug: log,
	info: log,
	warn: log,
	error: log
};

const nfc = new NFC(minilogger); // const nfc = new NFC(minilogger); // optionally you can pass logger to see internal debug logs

let readers = [];

nfc.on('reader', async reader => {

	pretty.info(`device attached`, { reader: reader.name });

	readers.push(reader);


	// needed for reading tags emulated with Android HCE AID
	// see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
	reader.aid = 'F222222222';

	console.log();

	try {
		await reader.connect(CONNECT_MODE_DIRECT);
		await reader.setBuzzerOutput(false);
		await reader.disconnect();
	} catch (err) {
		console.log(err);
	}

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
		// 	// we will authenticate block 4, 5, 6, 7 (which we want to read)
		// 	await Promise.all([
		// 		reader.authenticate(4, keyType, key),
		// 		reader.authenticate(5, keyType, key),
		// 		reader.authenticate(6, keyType, key),
		// 		reader.authenticate(7, keyType, key)
		// 	]);
		//
		// 	pretty.info(`blocks successfully authenticated`);
		//
		// } catch (err) {
		// 	pretty.error(`error when authenticating data`, { reader: reader.name, card, err });
		// 	return;
		// }


		// example reading 16 bytes assuming containing 16bit integer
		try {

			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// ! Caution! length must be divisible by blockSize

			const data = await reader.read(4, 16);

			pretty.info(`data read`, { reader: reader.name, card, data });

			const payload = data.readInt16BE();

			pretty.info(`data converted`, payload);

		} catch (err) {
			pretty.error(`error when reading data`, { reader: reader.name, card, err });
			await reader.led(0b01011101, [0x02, 0x01, 0x05, 0x01]);
			return;
		}


		// example write 16bit integer
		try {

			// reader.write(blockNumber, data, blockSize = 4)
			// - blockNumber - memory block number where to start writing
			// - data - what to write
			// ! Caution! data.length must be divisible by blockSize

			const data = Buffer.allocUnsafe(16);
			data.writeInt16BE(800);

			await reader.write(4, data);

			pretty.info(`data written`, { reader: reader.name, card });

		} catch (err) {
			pretty.error(`error when writing data`, { reader: reader.name, card, err });
			await reader.led(0b01011101, [0x02, 0x01, 0x05, 0x01]);
			return;
		}


		try {

			await reader.led(0b00101110, [0x01, 0x00, 0x01, 0x01]);

		} catch (err) {
			pretty.error(`error when writing led`);
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
