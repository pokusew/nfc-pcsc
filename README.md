# nfc-pcsc

[![npm](https://img.shields.io/npm/v/nfc-pcsc.svg?maxAge=2592000)](https://www.npmjs.com/package/nfc-pcsc)
[![nfc-pcsc channel on discord](https://img.shields.io/badge/discord-join%20chat-61dafb.svg)](https://discord.gg/bg3yazg)

A simple wrapper around [pokusew/node-pcsclite](https://github.com/pokusew/node-pcsclite) to work easier with NFC tags.

Built-in support for reading **card UIDs** and reading tags emulated with [**Android HCE**](https://developer.android.com/guide/topics/connectivity/nfc/hce.html).

> **NOTE:** Reading tag UID and methods for writing and reading tag content **depend on NFC reader commands support**.
It is tested to work with **ACR122 USB reader** but it can work with others too.  
When detecting tags does not work see [Alternative usage](#alternative-usage).

## Content

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installing](#installing)
- [Flow of handling tags](#flow-of-handling-tags)
- [Basic usage](#basic-usage)
	- [Running examples locally](#running-examples-locally)
- [Alternative usage](#alternative-usage)
- [Reading and writing data](#reading-and-writing-data)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installing

Using npm

```bash
npm install nfc-pcsc --save
```

## Flow of handling tags

When a NFC tag (card) is attached to the reader, the following is done:

1. it tries to find out the standard of card (`TAG_ISO_14443_3` or `TAG_ISO_14443_4`)

2. it will connect to the card, so any other card specific commands could be send

3. handling of card
	
	- when `autoProcessing` is true (default value) it will handle card by the standard:  
		
		`TAG_ISO_14443_3` *(Mifare Ultralight, 1K ...)*: sends GET_DATA command to retrieve card UID  
		`TAG_ISO_14443_4` *(e.g.: Andorid HCE)*: sends SELECT_APDU command to retrive data by file
		
		**then `card` event is fired, for which you can listen and then you can read or write data on the card**  
		see [Basic usage](#basic-usage) how to do it
		
	- when `autoProcessing` is false (default value) it will only fire `card` event  
	  then you can send whatever commands you want using `reader.transmit` method  
	  see [Alternative usage](#alternative-usage) how to do it
	  
4. you can read data, write data and send other commands


## Basic usage

> ### Running examples locally
> If you want see it in action, clone this repository, install dependencies with npm and run `npm run test`.
> ```bash
> git clone https://github.com/pokusew/nfc-pcsc.git
> npm install
> npm run test
> ```


```javascript
import NFC from 'nfc-pcsc';

const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

	console.log(`${reader.reader.name}  device attached`);

	// needed for reading tags emulated with Android HCE
	// custom AID, change according to your Android for tag emulation
    // see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
    reader.aid = 'F222222222';

	reader.on('card', card => {

	    // card is object containig folowing data
	    // [always] String type: TAG_ISO_14443_3 (standard nfc tags like Mifare) or TAG_ISO_14443_4 (Android HCE and others)
        // [only TAG_ISO_14443_3] String uid: tag uid
        // [only TAG_ISO_14443_4] Buffer data: raw data from select APDU response

		console.log(`${reader.reader.name}  card detected`, card);

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
```

## Alternative usage

You can **disable auto processing of tags** and process them yourself.
It may be useful when you are using other than ACR122 USB reader or non-standard tags.

```javascript
import NFC from 'nfc-pcsc';

const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

    // disable auto processing
    reader.autoProcessing = false;

	console.log(`${reader.reader.name}  device attached`);

	// needed for reading tags emulated with Android HCE
	// custom AID, change according to your Android for tag emulation
    // see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
    reader.aid = 'F222222222';

	reader.on('card', card => {
		
		// card is object containig folowing data
       	// String standard: TAG_ISO_14443_3 (standard nfc tags like Mifare) or TAG_ISO_14443_4 (Android HCE and others)
        // Buffer atr
        // Number protocol
		
	    console.log(`${reader.reader.name}  card inserted`, card);
	    
	    // you can use reader.transmit to send commands and retrieve data
	    // see https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L367
	    
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
```

## Reading and writing data

You can read from and write to numerous NFC tags including Mifare Ultralight (tested), Mifare 1K, ...

See above how to set up reader.

```javascript
reader.on('card', async card => {


	// Notice: reading data from Mifare Classic cards (e.g. Mifare 1K) requires,
	// that the data block must be authenticated first
	// don't forget to fill your keys and types
	// reader.authenticate(blockNumber, keyType, key)
	// uncomment when you need it

	// try {
	//
	// 	const key = 'FFFFFFFFFFFF';
	// 	const keyType = KEY_TYPE_A;
	//
	// 	// we will authenticate block 4, 5, 6, 7 (which we want to read)
	// 	await Promise.all([
	// 		reader.authenticate(4, keyType, key),
	// 		reader.authenticate(5, keyType, key),
	// 		reader.authenticate(6, keyType, key),
	// 		reader.authenticate(7, keyType, key)
	// 	]);
	//
	// 	console.log(`blocks successfully authenticated`);
	//
	// } catch (err) {
	// 	console.error(`error when authenticating data`, { reader: reader.name, card, err });
	// 	return;
	// }


	// example reading 16 bytes assuming containing 16bit integer
	try {

		// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
		// - blockNumber - memory block number where to start reading
		// - length - how many bytes to read
		// ! Caution! length must be divisible by blockSize

		const data = await reader.read(4, 16);

		console.log(`data read`, { reader: reader.name, card, data });

		const payload = data.readInt16BE();

		console.log(`data converted`, payload);

	} catch (err) {
		console.error(`error when reading data`, { reader: reader.name, card, err });
	}


	// example write 16bit integer
	try {

		// reader.write(blockNumber, data, blockSize = 4)
		// - blockNumber - memory block number where to start writing
		// - data - what to write
		// ! Caution! data.length must be divisible by blockSize

		const data = Buffer.allocUnsafe(16);
		data.writeInt16BE(800);

		await reader.write(4, data);

		console.log(`data written`, { reader: reader.name, card });

	} catch (err) {
		console.error(`error when writing data`, { reader: reader.name, card, err });
	}


});
```

## LICENSE

The nfc node module, documentation, tests, and build scripts are licensed
under the MIT license:

> Copyright Martin Endler
  
> Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  
> The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
  
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
