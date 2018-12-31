"use strict";

// #############
// Example: Basic usage
// - see "Basic usage" section in README for an explanation
// #############

import { NFC } from '../src/index';


const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

	console.log(`${reader.reader.name}  device attached`);

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

	reader.on('card', card => {

		// card is object containing following data
		// [always] String type: TAG_ISO_14443_3 (standard nfc tags like MIFARE) or TAG_ISO_14443_4 (Android HCE and others)
		// [always] String standard: same as type
		// [only TAG_ISO_14443_3] String uid: tag uid
		// [only TAG_ISO_14443_4] Buffer data: raw data from select APDU response

		console.log(`${reader.reader.name}  card detected`, card);

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
