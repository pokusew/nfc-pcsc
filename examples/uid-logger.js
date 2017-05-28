"use strict";

// #############
// Logs cards' uid
// #############

import NFC, { TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/NFC';


const nfc = new NFC();

nfc.on('reader', reader => {


	reader.on('card', card => {
		console.log(card.uid);
	});

	reader.on('error', err => {
		console.error(err);
	});

	reader.on('end', () => {

	});


});

nfc.on('error', err => {
	console.error(err);
});
