'use strict';

// #############
// Example: MIFARE Ultralight C (MF0ICU2) - 3DES authentication
// - Note: This example ONLY works with the ACR122U USB NFC reader or possibly any reader
//         that uses the NXP PN533 or similar NFC frontends.
// - Docs (descriptions of the commands and data structure):
//   - MIFARE Ultralight C - see https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf
//   - ACR122U - see https://www.acs.com.hk/download-manual/419/API-ACR122U-2.04.pdf
//   - NXP PN533 (embedded in the ACR122U) - https://www.nxp.com/docs/en/user-guide/157830_PN533_um080103.pdf
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B, TransmitError } from '../src/index';
import pretty from './pretty-logger';
import crypto from 'crypto';
import assert from 'assert/strict';

export class MifareUltralight3DESAuthenticationError extends TransmitError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'MifareUltralight3DESAuthenticationError';

	}

}

export class MifareUltralightReadError extends TransmitError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'MifareUltralightReadError';

	}

}

export class MifareUltralightWriteError extends TransmitError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'MifareUltralightWriteError';

	}

}

/**
 * Validates that the given data is a Buffer or a HEX string of the specified byte length
 * @param name {string} data name for debugging
 * @param data {Buffer|string} a Buffer or a HEX string
 * @param length {number} number of bytes
 * @returns {Buffer} the data converted to a Buffer
 */
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

/**
 * Constructs a ACR122U Direct Transmit command
 *
 * Docs:
 * - ACR122U - see https://www.acs.com.hk/download-manual/419/API-ACR122U-2.04.pdf
 *   - Section 6.1 Direct Transmit
 *
 * @param payload {Buffer|ArrayBuffer|Uint8Array|number[]}
 * @returns {Buffer}
 */
const ACR122U_DirectTransmit = (payload) => {

	if (Array.isArray(payload) || ArrayBuffer.isView(payload)) {
		payload = Buffer.from(payload);
	}
	else if (!Buffer.isBuffer(payload)) {
		throw new Error(`payload must be a Buffer`);
	}

	// ACR122U Direct Transmit supports up to 255 bytes
	if (payload.length > 255) {
		throw new Error(`payload cannot be longer than 255 bytes`);
	}

	// Direct Transmit command (see ACR122U docs, Section 6.1 Direct Transmit)
	return Buffer.from([
		0xFF, // Class
		0x00, // INS
		0x00, // P1
		0x00, // P2
		payload.length, // Lc: Length of the Direct Transmit Payload
		...payload, // Data In
	]);

}

/**
 * Constructs a NXP PN533 InDataExchange command
 *
 * Docs:
 * - NXP PN533 (embedded in the ACR122U) - https://www.nxp.com/docs/en/user-guide/157830_PN533_um080103.pdf
 *   - Section 8.4.8 InDataExchange
 *
 * @param tg {number}
 * @param dataOut {Buffer|ArrayBuffer|Uint8Array|number[]}
 * @returns {Buffer}
 */
const PN533_InDataExchange = (tg, dataOut) => {

	if (!Number.isInteger(tg) || tg < 0 || tg > 0xFF) {
		throw new Error(`tg must be an integer in range [0, 255]`);
	}

	if (Array.isArray(dataOut) || ArrayBuffer.isView(dataOut)) {
		dataOut = Buffer.from(dataOut);
	}
	else if (!Buffer.isBuffer(dataOut)) {
		throw new Error(`dataOut must be a Buffer`);
	}

	if (dataOut.length > 263) {
		throw new Error(`dataOut cannot be longer than 264 bytes`);
	}

	// InDataExchange command (see NXP PN533 docs, Section 8.4.8 InDataExchange)
	return Buffer.from([
		0xD4,
		0x40,
		tg,
		...dataOut,
	]);

}

/**
 * Constructs a NXP PN533 InCommunicateThru command
 *
 * Docs:
 * - NXP PN533 (embedded in the ACR122U) - https://www.nxp.com/docs/en/user-guide/157830_PN533_um080103.pdf
 *   - Section 8.4.9 InCommunicateThru
 *
 * @param dataOut {Buffer|ArrayBuffer|Uint8Array|number[]}
 * @returns {Buffer}
 */
const PN533_InCommunicateThru = (dataOut) => {

	if (Array.isArray(dataOut) || ArrayBuffer.isView(dataOut)) {
		dataOut = Buffer.from(dataOut);
	}
	else if (!Buffer.isBuffer(dataOut)) {
		throw new Error(`dataOut must be a Buffer`);
	}

	if (dataOut.length > 264) {
		throw new Error(`dataOut cannot be longer than 264 bytes`);
	}

	// InCommunicateThru command (see NXP PN533 docs, Section 8.4.9 InCommunicateThru)
	return Buffer.from([
		0xD4,
		0x42,
		...dataOut,
	]);

}

class MifareUltralightC {

	// See Section 7.5 Memory organization
	static NUM_PAGES = 48; // first 0x00, last 0x2F
	static PAGE_SIZE = 4; // 4 bytes (48 * 4 = 192 bytes EEPROM)
	// The first 4 memory pages (0x00 - 0x03) contain the 7-byte UID and its 2 Block Check Character Bytes (BCC),
	// 1 byte internal data (INT), 2 LOCK bytes, and 4 OTP bytes (7 + 2 + 1 + 2 + 4 = 16 bytes)
	// 36 user memory pages (app data, freeform), 36 * 4 = 144 bytes
	static USER_PAGE_FIRST = 0x04;
	static USER_PAGE_LAST = 0x27;
	// page 0x28 contain 2 LOCK bytes (LOCK2, LOCK3), the other 2 bytes of the page are not usable
	// page 0x29 contain one 16-bit counter, the other 2 bytes of the page are not usable
	static AUTH0_PAGE = 0x2A;
	static AUTH1_PAGE = 0x2B;
	static AUTH_KEY_PAGE_1 = 0x2C;
	static AUTH_KEY_PAGE_2 = 0x2D;
	static AUTH_KEY_PAGE_3 = 0x2E;
	static AUTH_KEY_PAGE_4 = 0x2F;
	static MEMORY_ACCESS_ONLY_WRITE_RESTRICTED = 0x01;
	static MEMORY_ACCESS_READ_WRITE_RESTRICTED = 0x00;

	constructor(reader) {
		this.reader = reader;
	}

	/**
	 * Performs the 3DES authentication using the AUTHENTICATE command
	 *
	 * Docs:
	 * - MIFARE Ultralight C - see https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf
	 *   - Section 7.5.5 3DES Authentication
	 *   - Section 9.5 AUTHENTICATE
	 * - ACR122U - see https://www.acs.com.hk/download-manual/419/API-ACR122U-2.04.pdf
	 *   - Section 6.1 Direct Transmit
	 * - NXP PN533 (embedded in the ACR122U) - https://www.nxp.com/docs/en/user-guide/157830_PN533_um080103.pdf
	 *   - Section 8.4.9 InCommunicateThru
	 *
	 * @param key {Buffer|string} the 16-bytes 3DES (DES-EDE-CBC) authentication key,
	 *                            exactly the same byte order (**little-endian**) as when writing
	 *                            to the auth key pages 0x2C-2F,
	 *                            the first 8 bytes (0-7) correspond to the Key 1 (K1)
	 *                            and the second 8 bytes (8-15) correspond to the Key 2 (K2),
	 *                            see {@link MifareUltralightC.swapKeyEndianness}
	 *                            for more info about the keys endianness (byte order)
	 * @throws MifareUltralight3DESAuthenticationError
	 * @returns {Promise<void>}
	 */
	async authenticate3DES(key) {

		key = parseBytes('key', key, 16);
		this.reader.logger.debug('key', key);
		const keyBE = MifareUltralightC.swapKeyEndianness(key);
		this.reader.logger.debug('keyBE', keyBE);

		// See MIFARE Ultralight C docs, Section 7.5.5 3DES Authentication, Table 8
		// Note 1:
		//   The MIFARE Ultralight C docs use the || symbol which (in that context) denotes concatenation,
		//   e.g., X || Y means concatenate(X, Y).
		//   We use this symbol with the same meaning in the following code comments.
		// Note 2:
		//   In the variable names, we use `2` instead of `'`. For example, RndB2 instead of RndB'.
		// Note 3:
		//   The numbering of the steps in the code below does not match the numbering used in Table 8.

		// 1. Get the encrypted RndB (8 bytes) from the PICC (MIFARE Ultralight C).
		//    This starts the authentication process.
		const ekRndB = await this._authenticatePart1();
		this.reader.logger.debug('ekRndB', ekRndB);

		// 2. Generate an 8-byte random number RndA.
		const RndA = crypto.randomBytes(8);
		this.reader.logger.debug('RndA', RndA);

		// 3. Compute ek(RndA || RndB').
		// First, get RndB by decrypting ekRndB.
		// The 1st encryption/decryptions uses the all zero IV.
		const iv1 = MifareUltralightC.ZERO_IV;
		const RndB = MifareUltralightC.decrypt(keyBE, ekRndB, iv1);
		this.reader.logger.debug('RndB', RndB);
		// Then, compute RndB' by rotating the original RndB left by 8 bits.
		//   RndB  = [ byte 0, byte 1, byte 2, byte 3, byte 4, byte 5, byte 6, byte 7 ]
		//   RndB' = [ byte 1, byte 2, byte 3, byte 4, byte 5, byte 6, byte 7, byte 0 ]
		const RndB2 = Buffer.concat([RndB.subarray(1, 8), RndB.subarray(0, 1)]);
		this.reader.logger.debug('RndB2', RndB2);
		// Finally, compute ek(RndA || RndB').
		// For the subsequent encryptions/decryptions, the IV must be the last ciphertext block.
		const iv2 = ekRndB;
		const ekRndARndB2 = MifareUltralightC.encrypt(keyBE, Buffer.concat([RndA, RndB2]), iv2);
		this.reader.logger.debug('ekRndARndB2', ekRndARndB2);

		// 4. Send ek(RndA || RndB') to get the encrypted RndA' from the PICC (MIFARE Ultralight C).
		//    This is the second and final authentication command.
		const ekRndA2 = await this._authenticatePart2(ekRndARndB2);
		this.reader.logger.debug('ekRndA2', ekRndA2);

		// 5. Decrypt the ekRndA' and un-rotate it to get the RndA from the PICC (MIFARE Ultralight C)
		//    for comparison with our RndA.
		// First, decrypt.
		// For the subsequent encryptions/decryptions, the IV must be the last ciphertext block.
		// ekRndARndB2 is 16 bytes, i.e., 2 ciphertext blocks, and we want the last one
		const iv3 = ekRndARndB2.subarray(8, 16);
		const RndA2 = MifareUltralightC.decrypt(keyBE, ekRndA2, iv3);
		// Then, un-rotate.
		const RndAFromUltralight = Buffer.concat([RndA2.subarray(7, 8), RndA2.subarray(0, 7)]);
		this.reader.logger.debug('RndA           (local)', RndA);
		this.reader.logger.debug('RndA (from Ultralight)', RndAFromUltralight);

		// 6. Finally, compare the decrypted RndA from the PICC (MIFARE Ultralight C) (RndAFromUltralight)
		//    with the RndA value we generated in our code in the step 2.
		//    If they are equal, the authentication process was successful.
		if (!RndA.equals(RndAFromUltralight)) {
			throw new MifareUltralight3DESAuthenticationError(
				'rnd_a_differs',
				'The RndA received from the MIFARE Ultralight C is different from the RndA that was sent. This means that the authentication process was not successful.',
			);
		}

		this.reader.logger.debug('authenticate3DES: RndA from Ultralight matches, successfully authenticated');

	}

	/**
	 * Creates a copy of the given authentication key but with swapped endianness (byte ordering) of the individual keys
	 *
	 * The authentication key is 16 bytes, where the first 8 bytes (0-7) correspond to the Key 1 (K1)
	 * and the second 8 bytes (8-15) correspond to the Key 2 (K2).
	 *
	 * This function preserve the keys order (`input key = [ K1 K2 ]`, `output key = [ K1 K2 ]`),
	 * but it changes byte ordering within the individual keys.
	 * ```
	 *    input key = [ K1B0 K1B1 K1B2 K1B3 K1B4 K1B5 K1B6 K1B7 K2B0 K2B1 K2B2 K2B3 K2B4 K2B5 K2B6 K2B7 ]
	 *   output key = [ K1B7 K1B6 K1B5 K1B4 K1B3 K1B2 K1B1 K1B0 K2B7 K2B6 K2B5 K2B4 K2B3 K2B2 K2B1 K2B0 ]
	 * ```
	 *
	 * @param key {Buffer} the two keys for DES-EDE-CBC stored as 16 bytes (2 x 8 bytes = 16 bytes),
	 *                     where the first 8 bytes (0-7) correspond to the Key 1 (K1)
	 *                     and the second 8 bytes (8-15) correspond to the Key 2 (K2).
	 * @returns {Buffer} a copy of the given key but with swapped byte ordering within the individual keys,
	 *                   BIG-endian to little-endian, little-endian to BIG-endian
	 */
	static swapKeyEndianness(key) {
		const keyCopy = Buffer.from(key);
		// since each key is 8 bytes, we can use the built-in swap64() method
		// to swap byte order of the two individual 8-byte keys
		keyCopy.swap64();
		return keyCopy;
		// alternatively, we could do it manually like this:
		// return Buffer.from([
		// 	/* Key 1 */ key[7], key[6], key[5], key[4], key[3], key[2], key[1], key[0],
		// 	/* Key 2 */ key[15], key[14], key[13], key[12], key[11], key[10], key[9], key[8],
		// ]);
	}

	static ZERO_IV = Buffer.alloc(8).fill(0);

	/**
	 * Decrypts the given data using the given key and the given IV using the `DES-EDE-CBC` algorithm
	 * (Two key triple DES EDE in CBC mode). This algorithm is used during the MIFARE Ultralight C authentication.
	 *
	 * From [MIFARE Ultralight C docs](https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf),
	 * Section 7.5.5 3DES Authentication:
	 * > The 3DES Authentication implemented in the MF0ICU2 proves that two entities
	 * > hold the same secret and each entity can be seen as a reliable partner for onwards communication.
	 * > The applied encryption algorithm ek() is the 2 key 3DES encryption
	 * > in Cipher-Block Chaining (CBC) mode as described in ISO/IEC 10116.
	 * > The Initial Value (IV) of the first encryption of the protocol is the all zero block.
	 * > IMPORTANT! For the subsequent encryptions/decryptions, the IV consists of the last ciphertext block._
	 *
	 * @param keyBE {Buffer} the two keys for DES-EDE-CBC stored as 16 bytes (2 x 8 bytes = 16 bytes),
	 *                       where the first 8 bytes (0-7) correspond to the Key 1 (K1)
	 *                       and the second 8 bytes (8-15) correspond to the Key 2 (K2),
	 *                       the individual keys (K1 and K2) must be **BIG-endian**,
	 *                       see {@link MifareUltralightC.swapKeyEndianness}
	 *                       for more info about the keys endianness (byte order)
	 * @param data {Buffer} the data to decrypt, the length must be a multiple of 8 bytes,
	 *                      which is the block size of DES-EDE-CBC
	 * @param iv {Buffer} the IV (8 bytes) (Initial Value, also called Initialization Vector)
	 *                    The 1st encryption/decryption during the MIFARE Ultralight C authentication
	 *                    uses the all zero IV. **IMPORTANT!** For the subsequent encryptions/decryptions,
	 *                    the IV must be the last ciphertext block.
	 * @returns {Buffer} the decrypted data, the returned Buffer has the same length (size) as the input data
	 */
	static decrypt(keyBE, data, iv) {
		// DES-EDE-CBC = Two key triple DES EDE in CBC mode
		//   (https://docs.openssl.org/3.4/man1/openssl-enc/#supported-ciphers)
		//   It has block size 8 bytes and the two keys are stored in the 16-bytes-long key (128 bits).
		//   However, only 112 bits are used, see https://crypto.stackexchange.com/a/63459.
		const decipher = crypto.createDecipheriv('DES-EDE-CBC', keyBE, iv);
		decipher.setAutoPadding(false);
		return Buffer.concat([decipher.update(data), decipher.final()]);
	}

	/**
	 * Encrypts the given data using the given key and the given IV using the `DES-EDE-CBC` algorithm
	 * (Two key triple DES EDE in CBC mode). This algorithm is used during the MIFARE Ultralight C authentication.
	 *
	 * From [MIFARE Ultralight C docs](https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf),
	 * Section 7.5.5 3DES Authentication:
	 * > The 3DES Authentication implemented in the MF0ICU2 proves that two entities
	 * > hold the same secret and each entity can be seen as a reliable partner for onwards communication.
	 * > The applied encryption algorithm ek() is the 2 key 3DES encryption
	 * > in Cipher-Block Chaining (CBC) mode as described in ISO/IEC 10116.
	 * > The Initial Value (IV) of the first encryption of the protocol is the all zero block.
	 * > IMPORTANT! For the subsequent encryptions/decryptions, the IV consists of the last ciphertext block._
	 *
	 * @param keyBE {Buffer} the two keys for DES-EDE-CBC stored as 16 bytes (2 x 8 bytes = 16 bytes),
	 *                       where the first 8 bytes (0-7) correspond to the Key 1 (K1)
	 *                       and the second 8 bytes (8-15) correspond to the Key 2 (K2),
	 *                       the individual keys (K1 and K2) must be **BIG-endian**,
	 *                       see {@link MifareUltralightC.swapKeyEndianness}
	 *                       for more info about the keys endianness (byte order)
	 * @param data {Buffer} the data to encrypt, the length must be a multiple of 8 bytes,
	 *                      which is the block size of DES-EDE-CBC
	 * @param iv {Buffer} the IV (8 bytes) (Initial Value, also called Initialization Vector)
	 *                    The 1st encryption/decryption during the MIFARE Ultralight C authentication
	 *                    uses the all zero IV. **IMPORTANT!** For the subsequent encryptions/decryptions,
	 *                    the IV must be the last ciphertext block.
	 * @returns {Buffer} the encrypted data, the returned Buffer has the same length (size) as the input data
	 */
	static encrypt(keyBE, data, iv) {
		// DES-EDE-CBC = Two key triple DES EDE in CBC mode
		//   (https://docs.openssl.org/3.4/man1/openssl-enc/#supported-ciphers)
		//   It has block size 8 bytes and the two keys are stored in the 16-bytes-long key (128 bits).
		//   However, only 112 bits are used, see https://crypto.stackexchange.com/a/63459.
		const encipher = crypto.createCipheriv('DES-EDE-CBC', keyBE, iv);
		encipher.setAutoPadding(false);
		return Buffer.concat([encipher.update(data), encipher.final()]);
	}

	/**
	 * Sends the AUTHENTICATE part 1 command and parses the response
	 *
	 * @see {authenticate3DES}
	 * @throws MifareUltralight3DESAuthenticationError
	 * @returns {Promise<Buffer>} ekRndB (8 bytes) - the encrypted RndB from the PICC (MIFARE Ultralight C)
	 */
	async _authenticatePart1() {

		const cmdAuthenticatePart1 = ACR122U_DirectTransmit(
			PN533_InCommunicateThru([
				// AUTHENTICATE part 1 command
				// see MIFARE Ultralight C docs, Section 9.5 AUTHENTICATE, Table 23
				0x1A, // Cmd: authentication part 1
				0x00, // Arg: fixed value 00h as argument
			]),
		);
		this.reader.logger.debug('cmdAuthenticatePart1', cmdAuthenticatePart1);

		/** @var {Buffer} */
		const resAuthenticatePart1 = await this.reader.transmit(
			cmdAuthenticatePart1,
			// expected response max length:
			// AUTHENTICATE part 1 response should look like the following (14 bytes)
			// D5 43 00 AF xx xx xx xx xx xx xx xx 90 00
			// bytes 0-1: D5 43 InCommunicateThru output prefix (see NXP PN533 docs, Section 8.4.9 InCommunicateThru)
			// byte 2: InCommunicateThru status, 0x00 is success (see NXP PN533 docs, Table 15. Error code list)
			// byte 3: AUTHENTICATE part 1 first response byte (0xAF) that indicates
			//         the authentication process needs a second command part
			// bytes 4-11 (8 bytes): ek(RndB) - 8-byte encrypted PICC random number RndB
			// bytes 12-13 (last 2 bytes): ACR122U success code 0x90 0x00
			14,
		);
		this.reader.logger.debug('resAuthenticatePart1', resAuthenticatePart1);

		if (resAuthenticatePart1.length !== 14) {
			throw new MifareUltralight3DESAuthenticationError(
				'unexpected_response_length',
				`Unexpected response length for cmdAuthenticatePart1. Expected 14 bytes but got ${resAuthenticatePart1.length} bytes.`,
			);
		}

		if (
			resAuthenticatePart1[0] !== 0xD5 ||
			resAuthenticatePart1[1] !== 0x43 ||
			resAuthenticatePart1[2] !== 0x00 ||
			resAuthenticatePart1[3] !== 0xAF ||
			resAuthenticatePart1[12] !== 0x90 ||
			resAuthenticatePart1[13] !== 0x00
		) {
			throw new MifareUltralight3DESAuthenticationError(
				'unexpected_response',
				`Unexpected response format for cmdAuthenticatePart1.`,
			);
		}

		// ekRndB - the encrypted RndB from the PICC (MIFARE Ultralight C)
		return resAuthenticatePart1.subarray(4, 12);

	}

	/**
	 * Sends the AUTHENTICATE part 2 command and parses the response
	 *
	 * @see {authenticate3DES}
	 * @param ekRndARndB2 {Buffer} ek(RndA || RndB'): 16-byte encrypted random numbers (RndA concatenated with RndB')
	 * @throws MifareUltralight3DESAuthenticationError
	 * @returns {Promise<Buffer>} ekRndA2 (8 bytes) - the encrypted RndA' from the PICC (MIFARE Ultralight C)
	 */
	async _authenticatePart2(ekRndARndB2) {

		const cmdAuthenticatePart2 = ACR122U_DirectTransmit(
			PN533_InCommunicateThru([
				// AUTHENTICATE part 2 command
				// see MIFARE Ultralight C docs, Section 9.5 AUTHENTICATE, Table 26
				0xAF, // Cmd: fixed first byte for the AUTHENTICATE part 2 command
				...ekRndARndB2, // ek(RndA || RndB'): 16-byte encrypted random numbers: RndA concatenated with RndB'
			]),
		);
		this.reader.logger.debug('cmdAuthenticatePart2', cmdAuthenticatePart2);

		/** @var {Buffer} */
		const resAuthenticatePart2 = await this.reader.transmit(
			cmdAuthenticatePart2,
			// expected response max length:
			// AUTHENTICATE part 1 response should look like the following (14 bytes)
			// D5 43 00 00 xx xx xx xx xx xx xx xx 90 00
			// bytes 0-1: D5 43 InCommunicateThru output prefix (see NXP PN533 docs, Section 8.4.9 InCommunicateThru)
			// byte 2: InCommunicateThru status, 0x00 is success (see NXP PN533 docs, Table 15. Error code list)
			// byte 3: AUTHENTICATE part 2 first response byte (0x00) that indicates
			//         the authentication process is finished after this command
			// bytes 4-11 (8 bytes): ek(RndA') - 8-byte encrypted, shifted PCD random number RndA'
			// bytes 12-13 (last 2 bytes): ACR122U success code 0x90 0x00
			14,
		);
		this.reader.logger.debug('resAuthenticatePart2', resAuthenticatePart2);

		if (resAuthenticatePart2.length !== 14) {
			throw new MifareUltralight3DESAuthenticationError(
				'unexpected_response_length',
				`Unexpected response length for cmdAuthenticatePart2. Expected 14 bytes but got ${resAuthenticatePart2.length} bytes.`,
			);
		}

		if (
			resAuthenticatePart2[0] !== 0xD5 ||
			resAuthenticatePart2[1] !== 0x43 ||
			resAuthenticatePart2[2] !== 0x00 ||
			resAuthenticatePart2[3] !== 0x00 ||
			resAuthenticatePart2[12] !== 0x90 ||
			resAuthenticatePart2[13] !== 0x00
		) {
			throw new MifareUltralight3DESAuthenticationError(
				'unexpected_response',
				`Unexpected response format for cmdAuthenticatePart2.`,
			);
		}

		// ekRndA2 - the encrypted RndA' from the PICC (MIFARE Ultralight C)
		return resAuthenticatePart2.subarray(4, 12);

	}

	/**
	 * Sends the READ command and parses the response
	 *
	 * Docs:
	 * - MIFARE Ultralight C - see https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf
	 *   - Section 9.2 READ
	 *
	 * @param page {number} the start page address [0x00, 0x2B]
	 * @throws MifareUltralightReadError
	 * @returns {Promise<Buffer>} the read data (16 bytes)
	 */
	async read(page) {

		const cmdRead = ACR122U_DirectTransmit(
			PN533_InCommunicateThru([
				// READ command
				// see MIFARE Ultralight C docs, Section 9.2 READ, Table 17
				0x30, // Cmd: read four pages
				page, // Addr: start page address [0x00, 0x2B]
			]),
		);
		this.reader.logger.debug('cmdRead', cmdRead);

		/** @var {Buffer} */
		const resRead = await this.reader.transmit(
			cmdRead,
			// expected response max length:
			// READ response should look like the following (21 bytes)
			// D5 41 00 [d0] ... [d15] 90 00
			// bytes 0-1: D5 43 InCommunicateThru output prefix (see NXP PN533 docs, Section 8.4.9 InCommunicateThru)
			// byte 2: InCommunicateThru status, 0x00 is success (see NXP PN533 docs, Table 15. Error code list)
			// bytes 3-18 (16 bytes): the read data
			// bytes 19-20 (last 2 bytes): ACR122U success code 0x90 0x00
			21,
		);
		this.reader.logger.debug('resRead', resRead);

		if (resRead.length !== 21) {
			throw new MifareUltralightReadError(
				'unexpected_response_length',
				`Unexpected response length for cmdRead. Expected 21 bytes but got ${resRead.length} bytes.`,
			);
		}

		if (
			resRead[0] !== 0xD5 ||
			resRead[1] !== 0x43 ||
			resRead[2] !== 0x00 ||
			resRead[19] !== 0x90 ||
			resRead[20] !== 0x00
		) {
			throw new MifareUltralightReadError(
				'unexpected_response',
				`Unexpected response format for cmdRead.`,
			);
		}

		// the read data
		return resRead.subarray(3, 19);

	}

	/**
	 * Sends the WRITE command and parses the response
	 *
	 * Docs:
	 * - MIFARE Ultralight C - see https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf
	 *   - Section 9.3 WRITE
	 *
	 * @param page {number} the page address [0x02, 0x2F]
	 * @param data {Buffer} the page data to write (4 bytes)
	 * @throws MifareUltralightReadError
	 * @returns {Promise<void>}
	 */
	async write(page, data) {

		const cmdWrite = ACR122U_DirectTransmit(
			// Interestingly, the InCommunicateThru command works as well, but the response
			// is always D5 43 02 90 00 (0x02 = "A CRC error has been detected by the CIU"),
			// even though that the WRITE command succeeds. Maybe it is because the WRITE command
			// does not have any data in its response?
			// Nevertheless, InDataExchange seems to work without this problem,
			// so we used it here instead of InCommunicateThru.
			PN533_InDataExchange(
				// PN533 supports only one target at the time.
				// By testing empirically, we figured that the Tg value should be always set to 1
				// (at least when the InDataExchange command is used in the standard ACR122U reader flow).
				1,
				[
					// WRITE command
					// see MIFARE Ultralight C docs, Section 9.3 WRITE, Table 19
					0xA2, // Cmd: write one page
					page, // Addr: the page address [0x02, 0x2F]
					...data, // Data: the page data to write (4 bytes)
				],
			),
		);
		this.reader.logger.debug('cmdWrite', cmdWrite);

		/** @var {Buffer} */
		const resWrite = await this.reader.transmit(
			cmdWrite,
			// expected response max length:
			// WRITE response should look like the following (5 bytes)
			// D5 41 00 90 00
			// bytes 0-1: D5 41 InDataExchange output prefix (see NXP PN533 docs, Section 8.4.8 InDataExchange)
			// byte 2: InDataExchange status, 0x00 is success (see NXP PN533 docs, Table 15. Error code list)
			// bytes 3-4 (last 2 bytes): ACR122U success code 0x90 0x00
			5,
		);
		this.reader.logger.debug('resWrite', resWrite);

		if (resWrite.length !== 5) {
			throw new MifareUltralightWriteError(
				'unexpected_response_length',
				`Unexpected response length for cmdWrite. Expected 5 bytes but got ${resWrite.length} bytes.`,
			);
		}

		if (
			resWrite[0] !== 0xD5 ||
			resWrite[1] !== 0x41 ||
			resWrite[2] !== 0x00 ||
			resWrite[3] !== 0x90 ||
			resWrite[4] !== 0x00
		) {
			throw new MifareUltralightWriteError(
				'unexpected_response',
				`Unexpected response format for cmdWrite.`,
			);
		}

	}

	/**
	 * Writes the given AUTH0 byte value
	 *
	 * Docs:
	 * - MIFARE Ultralight C - see https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf
	 *   - Section 7.5.8 Configuration for memory access via 3DES Authentication
	 *
	 * @param value {number} The AUTH0 byte value defines the page address from which the authentication is required.
	 *                       Valid address values are from `0x03` (all pages are protected)
	 *                       to `0x30` (memory protection effectively disabled).
	 * @see writeAuth1
	 * @returns {Promise<void>}
	 */
	async writeAuth0(value) {
		if (!Number.isInteger(value) || value < 0x03 || value > 0x30) {
			throw new Error('Invalid AUTH0 value!');
		}
		await this.write(MifareUltralightC.AUTH0_PAGE, Buffer.from([
			value,
			0x00,
			0x00,
			0x00,
		]));
	}

	/**
	 * Writes the given AUTH1 byte value
	 *
	 * Docs:
	 * - MIFARE Ultralight C - see https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf
	 *   - Section 7.5.8 Configuration for memory access via 3DES Authentication
	 *
	 * @param value {number} The AUTH1 byte value determines if only write access is restricted
	 *                       (`AUTH1 = 0bxxxxxxx1`), or if both read and write access
	 *                       are restricted (`AUTH1 = 0bxxxxxxx0`). The `x` symbol denotes ignored bits.
	 *                       The ignored are persisted, so they can be used for storing additional app-specific data.
	 * @see writeAuth0
	 * @returns {Promise<void>}
	 */
	async writeAuth1(value) {
		if (!Number.isInteger(value) || value < 0x00 || value > 0xFF) {
			throw new Error('Invalid AUTH1 value!');
		}
		await this.write(MifareUltralightC.AUTH1_PAGE, Buffer.from([
			value,
			0x00,
			0x00,
			0x00,
		]));
	}

}

// This is the default factory key of MIFARE Ultralight C
// See Section 7.5.10 Initial memory configuration, Table 13. Initial memory organization,
// https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf.
const DEFAULT_KEY = Buffer.from('BREAKMEIFYOUCAN!', 'utf-8');

// Note that some other implementations of the authenticate3DES
// might require the authentication key with a different byte order,
// see the MifareUltralightC.swapKeyEndianness() method above for more info.
assert.deepEqual(MifareUltralightC.swapKeyEndianness(DEFAULT_KEY), Buffer.from('IEMKAERB!NACUOYF', 'utf-8'));

const ZERO_KEY = Buffer.from('00000000000000000000000000000000', 'hex');
const ONES_KEY = Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex');
const DEMO_KEY = Buffer.from('AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDD', 'hex');

const nfc = new NFC(pretty); // we pass an optional logger to see internal debug logs

nfc.on('reader', async reader => {

	pretty.info(`device attached`, reader);

	const ultralightC = new MifareUltralightC(reader);

	reader.on('card', async card => {

		pretty.info('card detected', reader, card);

		try {

			// Note:
			//   Depending on your MIFARE Ultralight C configuration, authentication might not be required.
			//   In the factory state, all read/write operations are allowed without authentication.
			//   Nevertheless, we can always perform authentication.
			await ultralightC.authenticate3DES(DEFAULT_KEY);
			// await ultralightC.authenticate3DES(ZERO_KEY);
			// await ultralightC.authenticate3DES(ONES_KEY);
			// await ultralightC.authenticate3DES(DEMO_KEY);
			pretty.info('successfully authenticated');

			// # Update the authentication key

			// const key = DEFAULT_KEY;
			// // (Section 7.5.7 Programming of 3DES key to memory)
			// // // write data using the universal read/write methods (works with many standard PC/SC readers)
			// await reader.write(0x2C, key.subarray(0, 4), 4);
			// await reader.write(0x2D, key.subarray(4, 8), 4);
			// await reader.write(0x2E, key.subarray(8, 12), 4);
			// await reader.write(0x2F, key.subarray(12, 16), 4);
			// pretty.info('authentication key successfully written');
			// // // alternatively, use the WRITE command directly (only works with ACR122U NFC USB reader)
			// // await ultralightC.write(0x2C, key.subarray(0, 4));
			// // await ultralightC.write(0x2D, key.subarray(4, 8));
			// // await ultralightC.write(0x2E, key.subarray(8, 12));
			// // await ultralightC.write(0x2F, key.subarray(12, 16));
			// // pretty.info('authentication key successfully written');

			// # Protect memory from write and optionally read

			// // See Section 7.5.8 Configuration for memory access via 3DES Authentication of MF0ICU2.pdf.
			// const firstAuthProtectedPage = 0x28; // an example
			// const disableProtection = 0x30; // factory default
			// await ultralightC.writeAuth0(disableProtection);
			// // read-write protection, factory default
			// await ultralightC.writeAuth1(MifareUltralightC.MEMORY_ACCESS_READ_WRITE_RESTRICTED);
			// // only write protection
			// // await ultralightC.writeAuth1(MifareUltralightC.MEMORY_ACCESS_ONLY_WRITE_RESTRICTED);

			// Note that you can also use LOCK bytes LOCK 0-4 to turn selected pages permanently into a read-only memory.
			// See Section 7.5.2 and Section 7.5.3 of MF0ICU2.pdf.

			// // # Write data
			//
			// const text = Buffer.from('ahoy', 'utf8');
			// // write data using the universal read/write methods (works with many standard PC/SC readers)
			// await reader.write(0x20, text, 4);
			// // // alternatively, use the WRITE command directly (only works with ACR122U NFC USB reader)
			// // await ultralightC.write(0x20, text);
			//
			// // # Read data
			//
			// // read data using the universal read/write methods (works with many standard PC/SC readers)
			// const data = await reader.read(0x20, 4, 4);
			// pretty.info('data', data);
			// pretty.info('data as UTF8', data.toString('utf8'));
			// // // alternatively, use the READ command directly (only works with ACR122U NFC USB reader)
			// // const data = await ultralightC.read(0x20);
			// // pretty.info('data', data.subarray(0, 4));
			// // pretty.info('data as UTF8', data.subarray(0, 4).toString('utf8'));

		} catch (err) {
			pretty.error('error:', err);
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

/**
 * This is the 3DES Authentication example from Section 7.5.6 (Table 9)
 * of [MIFARE Ultralight C docs](https://www.nxp.com/docs/en/data-sheet/MF0ICU2.pdf).
 *
 * The function contains asserts (the expected values taken from the docs).
 * When the function returns without throwing an error,
 * it means our encryption/decryption methods work correctly.
 */
function numerical3DESExampleFromMF0ICU2() {

	const keyBE = parseBytes('key', '49454D4B41455242214E4143554F5946', 16);

	const PICC_RndB = parseBytes('PICC_RndB', '51E764602678DF2B', 8);
	const PICC_ekRndB = parseBytes('PICC_ekRndB', '577293FD2F34CA51', 8);

	const PCD_ekRndB = PICC_ekRndB;
	const PCD_RndB = MifareUltralightC.decrypt(keyBE, PCD_ekRndB, MifareUltralightC.ZERO_IV);
	if (!PCD_RndB.equals(PICC_RndB)) {
		throw new Error('PCD_RndB');
	}

	const PCD_RndA = parseBytes('PCD_RndA', 'A8AF3B256C75ED40', 8);
	const PCD_RndB2 = Buffer.concat([PCD_RndB.subarray(1, 8), PCD_RndB.subarray(0, 1)]);
	const PCD_RndARndB2 = Buffer.concat([PCD_RndA, PCD_RndB2]);
	const PCD_ekRndARndB2 = MifareUltralightC.encrypt(keyBE, PCD_RndARndB2, PCD_ekRndB);
	const expected_PCD_ekRndARndB2 = parseBytes('expected_PCD_ekRndARndB2', '0A638559FC7737F9F15D7862EBBE967A', 16);
	if (!PCD_ekRndARndB2.equals(expected_PCD_ekRndARndB2)) {
		throw new Error('PCD_ekRndARndB2');
	}

	const PICC_ekRndARndB2 = PCD_ekRndARndB2;
	const PICC_RndARndB2 = MifareUltralightC.decrypt(keyBE, PICC_ekRndARndB2, PICC_ekRndB);
	if (!PICC_RndARndB2.equals(PCD_RndARndB2)) {
		throw new Error('PICC_RndARndB2');
	}
	const PICC_RndA = PICC_RndARndB2.subarray(0, 8);
	if (!PICC_RndA.equals(PCD_RndA)) {
		throw new Error('PICC_RndA');
	}
	const PICC_RndA2 = Buffer.concat([PICC_RndA.subarray(1, 8), PICC_RndA.subarray(0, 1)]);
	const expected_PICC_ekRndA2 = parseBytes('expected_PICC_ekRndA2', '3B884FA07C137CE1', 8);
	const PICC_ekRndA2 = MifareUltralightC.encrypt(keyBE, PICC_RndA2, PICC_ekRndARndB2.subarray(8, 16));
	if (!PICC_ekRndA2.equals(expected_PICC_ekRndA2)) {
		throw new Error('PICC_ekRndA2');
	}

	const PCD_ekRndA2 = PICC_ekRndA2;
	const PCD_RndA2 = MifareUltralightC.decrypt(keyBE, PCD_ekRndA2, PCD_ekRndARndB2.subarray(8, 16));
	if (!PCD_RndA2.equals(PICC_RndA2)) {
		throw new Error('PCD_RndA2');
	}
	const PCD_RndA_fromPICC = Buffer.concat([PCD_RndA2.subarray(7, 8), PCD_RndA2.subarray(0, 7)]);
	if (!PCD_RndA_fromPICC.equals(PCD_RndA)) {
		throw new Error('PCD_RndA_fromPICC');
	}

}

numerical3DESExampleFromMF0ICU2();
