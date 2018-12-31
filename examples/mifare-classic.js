"use strict";

// #############
// Example: MIFARE Classic
// - should work well with any compatible PC/SC card reader
// - what is covered:
//   - authentication
//   - reading data from card
//   - writing data to card
// - what is NOT covered yet:
//   - using sector trailers to update access rights
// #############

// ## Note about the card's data structure
//
// ### MIFARE Classic EV1 1K
// – 1024 × 8 bit EEPROM memory
// – 16 sectors of 4 blocks
// – see https://www.nxp.com/docs/en/data-sheet/MF1S50YYX_V1.pdf
//
// ### MIFARE Classic EV1 4K
// – 4096 × 8 bit EEPROM memory
// – 32 sectors of 4 blocks and 8 sectors of 16 blocks
// – see https://www.nxp.com/docs/en/data-sheet/MF1S70YYX_V1.pdf
//
// One block contains 16 bytes.
// Don't forget specify the blockSize argument blockSize=16 in reader.read and reader.write calls.
// The smallest amount of data to write is one block. You can write only the entire blocks (card limitation).
//
// sector 0
// 	block 0 – manufacturer data (read only)
// 	block 1 – data block
// 	block 2 – data block
// 	block 3 – sector trailer 0
// 		bytes 00-05: Key A (default 0xFFFFFFFFFFFF) (6 bytes)
// 		bytes 06-09: Access Bits (default 0xFF0780) (4 bytes)
// 		bytes 10-15: Key B (optional) (default 0xFFFFFFFFFFFF) (6 bytes)
// sector 1:
// 	block 4 – data block
// 	block 5 – data block
// 	block 6 – data block
// 	block 7 – sector trailer 1
// sector 2:
// 	block 8 – data block
// 	block 9 – data block
// 	block 10 – data block
// 	block 11 – sector trailer 2
// ... and so on ...

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/index';
import pretty from './pretty-logger';


const nfc = new NFC(); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs

let readers = [];

nfc.on('reader', async reader => {

	pretty.info(`device attached`, reader);

	reader.on('card', async card => {


		// MIFARE Classic is ISO/IEC 14443-3 tag
		// skip other standards
		if (card.type !== TAG_ISO_14443_3) {
			return;
		}

		pretty.info(`card detected`, reader, card);

		// Reading and writing data from/to MIFARE Classic cards (e.g. MIFARE 1K) requires,
		// that the accessed data blocks must be authenticated first
		// Don't forget to fill YOUR keys and types! (default ones are stated below)
		// reader.authenticate(blockNumber, keyType, key, obsolete = false)
		// if you are experiencing problems, you can try using obsolete = true which is compatible with PC/SC V2.01

		try {

			const key = 'FFFFFFFFFFFF'; // key must be a HEX string on an instance of Buffer
			const keyType = KEY_TYPE_A;

			// we will authenticate block 4, ... (which we want to read)
			// authenticating one block within the sector will authenticate all blocks withing the sector
			// so in that case, block 4 is within the sector 1, all blocks (4, 5, 6, 7) will be authenticated with the given key
			await Promise.all([
				reader.authenticate(4, keyType, key),
				// reader.authenticate(8, keyType, key), // add other lines to authenticate more blocks, resp. sectors
			]);

			// Note: writing might require to authenticate with a different key (based on the sector access rights)

			pretty.info(`blocks successfully authenticated`);

		} catch (err) {
			pretty.error(`error when authenticating blocks`, { reader: reader.name, card, err });
			return;
		}


		// example reading 16 bytes assuming containing 16bit integer
		// !!! note that we don't need 16 bytes – 16bit integer takes just 2 bytes !!!
		try {

			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
			// ! Caution! length must be divisible by blockSize
			// ! Caution! MIFARE Classic cards have sector trailers
			//   containing access bits instead of data, each last block in sector is sector trailer
			//   (e.g. block 3, 7, 11, 14)
			//   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178

			const data = await reader.read(4, 16, 16); // blockSize=16 must specified for MIFARE Classic cards

			pretty.info(`data read`, reader, data);

			const payload = data.readInt16BE(0);

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
			// - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
			// ! Caution! data.length must be divisible by blockSize
			// ! Caution! MIFARE Classic cards have sector trailers
			//   containing access bits instead of data, each last block in sector is sector trailer
			//   (e.g. block 3, 7, 11, 14)
			//   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178

			const data = Buffer.allocUnsafe(16);
			data.fill(0);
			const randomNumber = Math.round(Math.random() * 1000);
			data.writeInt16BE(randomNumber, 0);

			await reader.write(4, data, 16); // blockSize=16 must specified for MIFARE Classic cards

			pretty.info(`data written`, reader, data);

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
