# nfc-pcsc

A simple wrapper around [santigimeno/node-pcsclite](https://github.com/santigimeno/node-pcsclite)

## Usage

```javascript
import NFC from './src/NFC';

const nfc = new NFC(logger);

let readers = [];

nfc.on('reader', reader => {

	console.log(`NFC (${reader.reader.name}): device attached`);

	readers.push(reader);

	console.log(readers);

	reader.on('card', card => {

		// card uid is hex string
		console.log(`NFC (${reader.reader.name}): card detected`, card.uid);

	});

	reader.on('error', err => {

		console.log(`NFC (${reader.reader.name}): an error occurred`, err);

	});

	reader.on('end', () => {

		console.log(`NFC (${reader.reader.name}): device removed`);

		delete readers[readers.indexOf(reader)];

		console.log(readers);

	});

});

nfc.on('error', err => {

	console.log('NFC: an error occurred', err);

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
