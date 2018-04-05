"use strict";

// #############
// Mifare Classic example
// - decoding and updating access bits and access keys
// #############
//
// Mifare Classic EV1 1K
// – 1024 × 8 bit EEPROM memory
// – 16 sectors of 4 blocks
// – see https://www.nxp.com/docs/en/data-sheet/MF1S50YYX_V1.pdf
//
// Mifare Classic EV1 4K
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


const isDefined = value => value !== null && value !== undefined;

function crop(string, length, align = 1) {

	if (string.length > length) {

		if (align === 1 || align === 2) {
			return string.slice(length - string.length);
		}

		if (align === 3) {
			return string.slice(0, -length - string.length);
		}

	}

	return string;

}

/**
 * Prefixes/Suffixes string with prefix (defaults to 0) to match the given length
 * e.g. '789', length 8 => '00000789'
 * e.g. 'hi', length 5 => '000hi'
 * @param string String
 * @param length Integer desired length
 * @param prefix string to use as prefix/suffix/padding
 * @param align 1 left / 2 center / 3 right
 * @param finalize function to finalize the padded string
 *                 defaults to crop if desired length is exceeded
 *                 – e.g. when using 2-char or more prefix or center align
 * @return String
 */
function paddy(string, length, prefix = '0', align = 1, finalize = crop) {

	let padded = string;

	if (padded.length >= length) {
		return padded;
	}

	while (padded.length < length) {
		padded = (align === 3 ? prefix : '') + padded + (align === 1 || align === 2 ? prefix : '');
	}

	return finalize(padded);

}

const column = (value, size, align = 1, paddingLeft = 0, paddingRight = 0) => {

	const v = value.toString();
	const s = (isDefined(size) ? size : v.length);

	return paddy('', paddingLeft, ' ') + paddy(v, s, ' ', align) + paddy('', paddingRight, ' ');

};

class BitSet {

	/**
	 * Creates a new BitSet (bit view for the Buffer instance)
	 * If an existing Buffer instance is given, then it will be used and no additional memory will be allocated.
	 * If an integer is given, then a new Buffer instance will be created allocating specified memory (bitsLength / 8)
	 * @param bitsLength bit length or existing Buffer instance
	 */
	constructor(bitsLength) {
		this.b = (bitsLength instanceof Buffer) ? bitsLength : Buffer.allocUnsafe(bitsLength / 8).fill(0);
	}

	clone() {
		// copies data into new buffer, allocates new memory
		return Buffer.from(this.b);
	}

	get buffer() {
		return this.b;
	}

	static getP1(pos) {
		return Math.trunc((pos - 1) / 8);
	}

	static getP2(pos) {
		return pos % 8;
	}

	set(pos) {
		this.b[BitSet.getP1(pos)] |= (1 << BitSet.getP2(pos));
	}

	test(pos) {
		return (this.b[BitSet.getP1(pos)] & (1 << BitSet.getP2(pos))) !== 0;
	}

	clear(pos) {
		this.b[BitSet.getP1(pos)] &= ~(1 << BitSet.getP2(pos));
	}

	toggle(pos) {
		this.b[BitSet.getP1(pos)] ^= (1 << BitSet.getP2(pos));
	}

	toArray(useBooleans = true) {
		const s = this.b.length * 8;
		const a = [];
		for (let pos = 0; pos < s; pos++) {
			if (useBooleans) {
				a.push(this.test(pos));
			}
			else {
				a.push(this.test(pos) ? 1 : 0);
			}
		}
		return a;
	}

	print(name, appendBlankLine = true) {

		const s = this.b.length * 8;

		let l1 = ' |       data:';
		let l2 = ' |            ';
		let l3 = ' | bit number:';

		for (let pos = s - 1; pos >= 0; pos--) {
			const numberString = column(pos, null, 3, 1);
			l1 += column(this.test(pos) ? 1 : 0, numberString.length - 1, 3, 1);
			l2 += column('↑', numberString.length - 1, 3, 1);
			l3 += numberString;
		}

		console.log(`BitSet:${name ? ' ' + name : ''}`, this.b);
		console.log(l1);
		console.log(l2);
		console.log(l3);
		if (appendBlankLine) {
			console.log();
		}

	}

}


const nfc = new NFC();


nfc.on('reader', async reader => {

	console.log(`device attached`, reader.name);

	// needed for reading tags emulated with Android HCE AID
	// see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
	reader.aid = 'F222222222';

	reader.on('card', async card => {

		console.log(card.uid);

		// Notice: reading (and writing) data from Mifare Classic cards (e.g. Mifare 1K) requires,
		// that the data block must be authenticated first
		// don't forget to fill your keys and types
		// reader.authenticate(blockNumber, keyType, key, obsolete = false)
		// if you are experiencing problems, you can try using obsolete = true which is compatible with PC/SC V2.01

		try {

			const key = 'FFFFFFFFFFFF';
			const keyType = KEY_TYPE_A;

			// we will authenticate block 3, ... (which we want to read)
			await Promise.all([
				reader.authenticate(3, keyType, key),
			]);

			console.log(`blocks successfully authenticated`);

		} catch (err) {
			console.error(`error when authenticating data`, reader.name, err);
			return;
		}

		try {

			// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start reading
			// - length - how many bytes to read
			// - blockSize - 16 for Mifare Classic
			// ! Caution! Mifare Classic cards have sector trailers
			//   containing access bits instead of data, each last block in sector is sector trailer
			//   (e.g. block 3, 7, 11, 14)
			//   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178

			// sector 0, sector trailer
			const sectorTrailer = await reader.read(3, 16, 16); // await reader.read(4, 16, 16); for Mifare Classic cards

			console.log(sectorTrailer);

			const accessBits = sectorTrailer.slice(6, 9);

			console.log(accessBits);

			//const MIFARE_CLASSIC_ACCESS_BITS_DEFAULT = 'ff0780';
			//const defaultAccessBits = Buffer.from(MIFARE_CLASSIC_ACCESS_BITS_DEFAULT, 'hex');

			const b6 = new BitSet(accessBits.slice(0, 1));
			const b7 = new BitSet(accessBits.slice(1, 2));
			const b8 = new BitSet(accessBits.slice(2, 3));

			b6.print('byte 6');
			b7.print('byte 7');
			b8.print('byte 8');

			// c1_[block number in sector]
			// c2_[block number in sector]
			// c3_[block number in sector]
			const c1_3 = b7.test(7);
			const c1_2 = b7.test(6);
			const c1_1 = b7.test(5);
			const c1_0 = b7.test(4);
			const c2_3 = b8.test(3);
			const c2_2 = b8.test(2);
			const c2_1 = b8.test(1);
			const c2_0 = b8.test(0);
			const c3_3 = b8.test(7);
			const c3_2 = b8.test(6);
			const c3_1 = b8.test(5);
			const c3_0 = b8.test(4);

			const blocks = [
				[c1_0, c2_0, c3_0],
				[c1_1, c2_1, c3_1],
				[c1_2, c2_2, c3_2],
				[c1_3, c2_3, c3_3],
			];

			console.log('Parsed access conditions:');
			console.log('block 0 [ C1, C2, C3 ]', blocks[0]);
			console.log('block 1 [ C1, C2, C3 ]', blocks[1]);
			console.log('block 2 [ C1, C2, C3 ]', blocks[2]);
			console.log('block 3 [ C1, C2, C3 ]', blocks[3], '(sector trailer)');


		} catch (err) {
			console.error(`error when reading data`, reader.name, err);
			return;
		}

		try {

			// reader.write(blockNumber, data, blockSize = 4, packetSize = 16)
			// - blockNumber - memory block number where to start writing
			// - data - what to write
			// - blockSize - 16 for Mifare Classic
			// ! Caution! data.length must be divisible by blockSize
			// ! Caution! Mifare Classic cards have sector trailers
			//   containing access bits instead of data, each last block in sector is sector trailer
			//   (e.g. block 3, 7, 11, 14)
			//   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178


			// await reader.write(4, data, 16);


		} catch (err) {
			console.error(`error when writing data`, reader.name, err);
			return;
		}


	});

	reader.on('error', err => {
		console.error(`an error occurred`, reader.name, err);
	});

	reader.on('end', () => {
		console.log(`device removed`, reader.name);
	});


});

nfc.on('error', err => {
	console.error(`an error occurred`, err);
});
