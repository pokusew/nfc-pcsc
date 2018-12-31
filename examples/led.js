"use strict";

// #############
// Example: Controlling LED and buzzer on ACR122U
// - what is covered:
//   - custom led blinks
//   - custom buzzer output
//   - repeated beeping on unsuccessful read/write operation
// - TODO:
//   - document how to allow escape commands (direct communication without card)
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B, CONNECT_MODE_DIRECT } from '../src/index';
import pretty from './pretty-logger';


const nfc = new NFC(pretty); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs


nfc.on('reader', async reader => {

	pretty.info(`device attached`, { reader: reader.name });

	// needed for reading tags emulated with Android HCE AID
	// see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
	reader.aid = 'F222222222';

	try {
		await reader.connect(CONNECT_MODE_DIRECT);
		await reader.setBuzzerOutput(false);
		await reader.disconnect();
	} catch (err) {
		console.log(err);
	}

	reader.on('card', async card => {


		// standard nfc tags like MIFARE
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

		// Notice: reading data from MIFARE Classic cards (e.g. MIFARE 1K) requires,
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

			pretty.info(`data read`, reader, data);

			const payload = data.readInt16BE(0);

			pretty.info(`data converted`, payload);

		} catch (err) {
			pretty.error(`error when reading data`, reader, err);
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
			data.writeInt16BE(800, 0);

			await reader.write(4, data);

			pretty.info(`data written`, reader, data);

		} catch (err) {
			pretty.error(`error when writing data`, reader, err);
			await reader.led(0b01011101, [0x02, 0x01, 0x05, 0x01]);
			return;
		}


		try {
			await reader.led(0b00101110, [0x01, 0x00, 0x01, 0x01]);
		} catch (err) {
			pretty.error(`error when writing led`, err);
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
