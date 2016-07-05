# nfc-pcsc

A simple wrapper around [santigimeno/node-pcsclite](https://github.com/santigimeno/node-pcsclite) to work easier with NFC tags using **ARC122 USB reader**.

Built-in support for reading **card UIDs** and reading tags emulated with [**Android HCE**](https://developer.android.com/guide/topics/connectivity/nfc/hce.html).

## Installing

Using npm

```bash
npm install nfc-pcsc --save
```

## Usage

> If you want see it in action, clone this repository, install dependencies with npm and run `npm run test`.
```bash
git clone https://github.com/pokusew/nfc-pcsc.git
npm install
npm run test
```


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

You can **disable auto processing of tags** and process them yourself. It may be useful when you are using other than ARC122 USB reader.

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

	reader.on('cardInserted', status => {
	    console.log(`${reader.reader.name}  card inserted`, status);
	    // for example see source here https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L106
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
