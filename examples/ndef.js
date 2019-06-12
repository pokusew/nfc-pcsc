"use strict";

// #############
// example not finished, it in progress !!!
// Read NDEF formatted data
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/index';
import pretty from './pretty';

const nfcCard = require('nfccard-tool');


const nfc = new NFC();

nfc.on('reader', reader => {

	console.log(`${reader.reader.name}  device attached`);

  reader.on('card', async card => {

	console.log(`card detected`, card);


	/**
	 * Write a card
	 */

    try {

		/**
		 *  1 - READ HEADER
		 *  Read header: we need to verify if we have read and write permissions
		 *               and if prepared message length can fit onto the tag.
		 */
		const cardHeader = await reader.read(0, 20);

		const tag = nfcCard.parseInfo(cardHeader);

		  /**
		   * 2 - WRITE A NDEF MESSAGE AND ITS RECORDS
		   */
		  const message = [
			{ type: 'text', text: 'I\'m a text message', language: 'en' },
			{ type: 'uri', uri: 'https://github.com/somq/nfccard-tool' },
			{ type: 'aar', packageName: 'com.github.nfccardtool' },
		  ]

		  // Prepare the buffer to write on the card
		  const rawDataToWrite = nfcCard.prepareBytesToWrite(message);

		  // Write the buffer on the card starting at block 4
		  const preparationWrite = await reader.write(4, rawDataToWrite.preparedData);

		  // Success !
		  if (preparationWrite) {
			console.log('Data have been written successfully.')
		  }

		} catch (err) {
		console.error(`error when reading data`, err);
		}


		/**
		 * Read a card
		 */

		try {

			/**
			 * READ MESSAGE AND ITS RECORDS
			 */

			/**
			 *  1 - READ HEADER
			 *  Read from block 0 to block 4 (20 bytes length) in order to parse tag information
			 */
			// Starts reading in block 0 until end of block 4
			const cardHeader = await reader.read(0, 20);

			const tag = nfcCard.parseInfo(cardHeader);
			console.log('tag info:', JSON.stringify(tag));

			/**
			 *  2 - Read the NDEF message and parse it if it's supposed there is one
			 */

			// There might be a NDEF message and we are able to read the tag
			if(nfcCard.isFormatedAsNDEF() && nfcCard.hasReadPermissions() && nfcCard.hasNDEFMessage()) {

				// Read the appropriate length to get the NDEF message as buffer
				const NDEFRawMessage = await reader.read(4, nfcCard.getNDEFMessageLengthToRead()); // starts reading in block 0 until 6

				// Parse the buffer as a NDEF raw message
				const NDEFMessage = nfcCard.parseNDEF(NDEFRawMessage);

				console.log('NDEFMessage:', NDEFMessage);

			} else {
				console.log('Could not parse anything from this tag: \n The tag is either empty, locked, has a wrong NDEF format or is unreadable.')
			}

		} catch (err) {
			console.error(`error when reading data`, err);
		}

	});

	reader.on('card.off', card => {
		console.log(`${reader.reader.name}  card removed`, card);
	});

	reader.on('error', err => {
		console.log(`${reader.reader.name}  an error occurred`, err);
	});

	reader.on('end', () => {
		console.log(`${reader.reader.name}  device removed`);
	});

});

nfc.on('error', err => {
	console.log('an error occurred', err);
});
