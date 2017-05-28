"use strict";

// #############
// Logs cards' uid
// #############

import NFC from '../src/NFC';


const nfc = new NFC();

nfc.on('reader', reader => {

	console.log(reader.name + ' reader attached, waiting for cards ...');

	reader.on('card', card => {
		console.log(card.uid);
	});

	reader.on('error', err => {
		console.error('reader error', err);
	});

	reader.on('end', () => {
		console.log(reader.name + ' reader disconnected.');
	});


});

nfc.on('error', err => {
	console.error(err);
});
