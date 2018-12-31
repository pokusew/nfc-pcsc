"use strict";

// #############
// Alternative usage
// - see "Alternative usage" section in README for an explanation
// #############

import { NFC } from '../src/index';


const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

	// disable auto processing
	reader.autoProcessing = false;

	console.log(`${reader.reader.name}  device attached`);

	reader.on('card', card => {

		// card is object containing following data
		// String standard: TAG_ISO_14443_3 (standard nfc tags like MIFARE) or TAG_ISO_14443_4 (Android HCE and others)
		// String type: same as standard
		// Buffer atr

		console.log(`${reader.reader.name}  card inserted`, card);

		// you can use reader.transmit to send commands and retrieve data
		// see https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L288

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
