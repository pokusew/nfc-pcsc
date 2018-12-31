'use strict';

// #############
// Example: MIFARE Ultralight EV1 and NTAG 213/215/216 – implementation of card's specific commands
// - note: for instructions on reading and writing the data,
//   please see read-write.js, which is common for all ISO/IEC 14443-3 tags
// - note: this guide applies to NTAG 213/215/216 cards as-well
//   (the commands and configuration pages structure is same or very similar,
//   the only difference is the location of the pages due to different user memory size)
// - docs (descriptions of the commands and data structure):
//   - MIFARE Ultralight EV1 – see https://www.nxp.com/docs/en/data-sheet/MF0ULX1.pdf
//   - NTAG 213/215/216 – https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf
// - note: works ONLY on ACR122U reader or possibly any reader which uses NXP PN533 and similar NFC frontends
// - what is covered:
//   - password authentication – PWD_AUTH command
//   - fast read – FAST_READ command
//   - setting card configuration pages – set custom password and access conditions
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B, TransmitError } from '../src/index';
import pretty from './pretty-logger';


export class MifareUltralightPasswordAuthenticationError extends TransmitError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'MifareUltralightPasswordAuthenticationError';

	}

}

export class MifareUltralightFastReadError extends TransmitError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'MifareUltralightFastReadError';

	}

}

const parseBytes = (name, data, length) => {

	if (!(data instanceof Buffer) && typeof data !== 'string') {
		throw new Error(`${name} must an instance of Buffer or a HEX string.`);
	}

	if (Buffer.isBuffer(data)) {

		if (data.length !== length) {
			throw new Error(`${name} must be ${length} bytes long.`);
		}

		return data;

	}

	if (typeof data === 'string') {

		if (data.length !== length * 2) {
			throw new Error(`${name} must be a ${length * 2} char HEX string.`);
		}

		return Buffer.from(data, 'hex');

	}

	throw new Error(`${name} must an instance of Buffer or a HEX string.`);

};

class MifareUltralight {

	constructor(reader) {
		this.reader = reader;
	}

	// PWD_AUTH
	async passwordAuthenticate(password, pack) {

		// PASSWORD (4 bytes) (stored on card in page 18)
		// PACK (2 bytes) (stored in page 19 as first two bytes)
		// PACK is the response from card in case of successful PWD_AUTH cmd

		password = parseBytes('Password', password, 4);
		pack = parseBytes('Pack', pack, 2);

		// CMD: PWD_AUTH via Direct Transmit (ACR122U) and Data Exchange (PN533)
		const cmd = Buffer.from([
			0xff, // Class
			0x00, // Direct Transmit (see ACR122U docs)
			0x00, // ...
			0x00, // ...
			0x07, // Length of Direct Transmit payload
			// Payload (7 bytes)
			0xd4, // Data Exchange Command (see PN533 docs)
			0x42, // InCommunicateThru
			0x1b, // PWD_AUTH
			...password,
		]);

		this.reader.logger.debug('pwd_auth cmd', cmd);


		const response = await this.reader.transmit(cmd, 7);

		this.reader.logger.debug('pwd_auth response', response);
		// pwd_auth response should look like the following (7 bytes)
		// d5 43 00 ab cd 90 00
		// byte 0: d5 prefix for response of Data Exchange Command (see PN533 docs)
		// byte 1: 43 prefix for response of Data Exchange Command (see PN533 docs)
		// byte 2: Data Exchange Command Status 0x00 is success (see PN533 docs, Table 15. Error code list)
		// bytes 3-4: Data Exchange Command Response – our PACK (set on card in page 19, in bytes 0-1) from card
		// bytes 5-6: ACR122U success code

		if (response.length < 5) {
			throw new MifareUltralightPasswordAuthenticationError('invalid_response_length', `Invalid response length ${response.length}. Expected minimal length was 2 bytes.`)
		}

		if (response[2] !== 0x00 || response.length < 7) {
			throw new MifareUltralightPasswordAuthenticationError('invalid_password', `Authentication failed. Might be invalid password or unsupported card.`);
		}

		if (!response.slice(3, 5).equals(pack)) {
			throw new MifareUltralightPasswordAuthenticationError('pack_mismatch', `Pack mismatch.`)
		}

		return;

	}

	// FAST_READ
	async fastRead(startPage, endPage) {

		// CMD: PWD_AUTH via Direct Transmit (ACR122U) and Data Exchange (PN533)
		const cmd = Buffer.from([
			0xff, // Class
			0x00, // Direct Transmit (see ACR122U docs)
			0x00, // ...
			0x00, // ...
			0x07, // Length of Direct Transmit payload
			// Payload (7 bytes)
			0xd4, // Data Exchange Command (see PN533 docs)
			0x42, // InCommunicateThru
			0x3a, // PWD_AUTH
			startPage,
			endPage,
		]);

		const length = 3 + ((endPage - startPage + 1) * 4) + 2;

		const response = await this.reader.transmit(cmd, length);

		if (response < length) {
			throw new MifareUltralightFastReadError('invalid_response_length', `Invalid response length ${response.length}. Expected length was ${length} bytes.`)
		}

		return response.slice(3, -2);

	}

}

const nfc = new NFC(pretty); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs

nfc.on('reader', async reader => {

	pretty.info(`device attached`, reader);

	const ultralight = new MifareUltralight(reader);

	reader.on('card', async card => {

		pretty.info('card detected', reader, card);

		const password = 'FFFFFFFF'; // default password
		const pack = '0000'; // default pack

		try {

			await ultralight.passwordAuthenticate(password, pack);

			pretty.info('passwordAuthenticate: successfully authenticated');

		} catch (err) {
			pretty.error('passwordAuthenticate error:', err);
		}

		try {

			const data = await ultralight.fastRead(16, 19);

			pretty.info('fastRead data:', data);

		} catch (err) {
			pretty.error('fastRead error:', err);
			return;
		}

		// Note! UPDATE locations of configuration pages according to the version of your card!
		// (see memory layout in your card's docs)

		// try {
		//
		// 	// set custom PASSWORD (4 bytes) (stored in page 18)
		// 	await reader.write(19, password);
		//
		// 	// set custom PACK (2 bytes) (stored in page 19 as first two bytes
		// 	const packPage = await reader.read(19, 4);
		// 	packPage[0] = pack[0];
		// 	packPage[1] = pack[1];
		// 	await reader.write(19, packPage);
		//
		// 	// read current configuration
		// 	const config = await reader.read(16, 8);
		//
		// 	// Configuration page 16
		// 	console.log(config[0]);
		// 	console.log(config[1]);
		// 	console.log(config[2]);
		// 	console.log(config[3]); // AUTH0 (default: 0xff)
		//
		// 	// Configuration page 17
		// 	console.log(config[4]); // ACCESS
		// 	console.log(config[5]); // VCTID (default: 0x05)
		// 	console.log(config[6]);
		// 	console.log(config[7]);
		//
		// 	// Protect everything (start with first data page)
		// 	config[3] = 0x04;
		//
		// 	// set ACCESS bits
		// 	// bit 7: PROT One bit inside the ACCESS byte defining the memory protection
		// 	//          0b ... write access is protected by the password verification
		// 	//          1b ... read and write access is protected by the password verification
		// 	// bit 6: CFGLCK Write locking bit for the user configuration
		// 	//        - 0b ... user configuration open to write access
		// 	//        - 1b ... user configuration permanently locked against write access
		// 	// bits 5-3: reserved
		// 	// bits 2-0: AUTHLIM
		// 	// bit number-76543210
		// 	//            ||||||||
		// 	config[4] = 0b10000000;
		//
		// 	// set custom access rules
		// 	await reader.write(16, config);
		//
		// } catch (err) {
		// 	pretty.error('configuration write error:', err);
		// }

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
