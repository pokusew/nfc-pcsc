"use strict";

// #############
// Example accessing and authenticating Mifare DESFire cards
// #############

import { NFC } from '../src/index';
import pretty from './pretty';
import crypto from 'crypto';


// config
const desfire = {
	key: '00000000000000000000000000000000',
	appId: [0x00, 0x00, 0x00],
	keyId: [0x00],
	read: {
		fileId: [0x02],
		offset: [0x00, 0x00, 0x00],
		length: [14, 0x00, 0x00]
	}
};


function decrypt(key, data, iv = Buffer.alloc(8).fill(0)) {

	const decipher = crypto.createDecipheriv('DES-EDE-CBC', key, iv);
	decipher.setAutoPadding(false);

	return Buffer.concat([decipher.update(data), decipher.final()]);

}

function encrypt(key, data, iv = Buffer.alloc(8).fill(0)) {

	const decipher = crypto.createCipheriv('DES-EDE-CBC', key, iv);
	decipher.setAutoPadding(false);

	return Buffer.concat([decipher.update(data), decipher.final()]);

}


const nfc = new NFC();

let readers = [];

nfc.on('reader', async reader => {

	pretty.info(`device attached`, { reader: reader.name });

	readers.push(reader);

	// we have to handle Mifare DESFIRE
	reader.autoProcessing = false;

	// just handy shortcut to send data
	const send = async (cmd, comment = null, responseMaxLength = 40) => {

		const b = Buffer.from(cmd);

		console.log((comment ? `[${comment}] ` : '') + `sending`, b);

		const data = await reader.transmit(b, responseMaxLength);

		console.log((comment ? `[${comment}] ` : '') + `received data`, data);

		return data;

	};

	const wrap = (cmd, dataIn) => ([0x90, cmd, 0x00, 0x00, dataIn.length, ...dataIn, 0x00]);

	reader.on('card', async card => {

		pretty.info(`card detected`, { reader: reader.name, card });

		const selectApplication = async () => {

			// 1: [0x5A] SelectApplication(appId) [4 bytes] - Selects one specific application for further access
			// DataIn: appId (3 bytes)
			const res = await send(wrap(0x5a, desfire.appId), 'step 1 - select app');

			// something went wrong
			if (res.slice(-1)[0] !== 0x00) {
				throw new Error('error in step 1');
			}


		};

		const authenticate = async (key) => {

			// 2: [0x0a] Authenticate(keyId) [2bytes]
			// DataIn: keyId (1 byte)
			const res1 = await send(wrap(0x0a, desfire.keyId), 'step 2 - authenticate');

			// something went wrong
			if (res1.slice(-1)[0] !== 0xaf) {
				throw new Error('error in step 2 - authenticate');
			}

			// encrypted RndB from reader
			// cut out status code (last 2 bytes)
			const ecRndB = res1.slice(0, -2);

			// decrypt it
			const RndB = decrypt(key, ecRndB);

			// rotate RndB
			const RndBp = Buffer.concat([RndB.slice(1, 8), RndB.slice(0, 1)]);

			// generate a 8 byte Random Number A
			const RndA = crypto.randomBytes(8);

			// concat RndA and RndBp
			const msg = encrypt(key, Buffer.concat([RndA, RndBp]));

			// send it back to the reader
			const res2 = await send(wrap(0xaf, msg), 'step 2 - set up RndA');

			// something went wrong
			if (res2.slice(-1)[0] !== 0x00) {
				throw new Error('error in step 2 - set up RndA');
			}

			// encrypted RndAp from reader
			// cut out status code (last 2 bytes)
			const ecRndAp = res2.slice(0, -2);

			// decrypt to get rotated value of RndA2
			const RndAp = decrypt(key, ecRndAp);

			// rotate
			const RndA2 = Buffer.concat([RndAp.slice(7, 8), RndAp.slice(0, 7)]);

			// compare decrypted RndA2 response from reader with our RndA
			// if it equals authentication process was successful
			if (!RndA.equals(RndA2)) {
				throw new Error('error in step 2 - match RndA random bytes');
			}

			return {
				RndA,
				RndB
			};

		};

		const readData = async () => {

			// 3: [0xBD] ReadData(FileNo,Offset,Length) [8bytes] - Reads data from Standard Data Files or Backup Data Files
			const res = await send(wrap(0xbd, [desfire.read.fileId, ...desfire.read.offset, ...desfire.read.length]), 'step 3 - read', 255);

			// something went wrong
			if (res.slice(-1)[0] !== 0x00) {
				throw new Error('error in step 3 - read');
			}

			console.log('data', res);

		};


		try {

			// step 1
			await selectApplication();

			// step 2
			const key = new Buffer(desfire.key, 'hex');
			await authenticate(key);

			// step 3
			await readData();


		} catch (err) {

			pretty.error(`error occurred during processing steps`, { reader: reader.name });
			console.log(err);

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
