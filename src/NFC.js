"use strict";

import pcsclite from '@pokusew/pcsclite';
import EventEmitter from 'events';
import Reader from './Reader';
import ACR122Reader from './ACR122Reader';


class NFC extends EventEmitter {

	pcsc = null;
	logger = null;

	constructor(logger) {
		super();

		this.pcsc = pcsclite();

		if (logger) {
			this.logger = logger;
		}
		else {
			this.logger = {
				log: function () {
				},
				debug: function () {
				},
				info: function () {
				},
				warn: function () {
				},
				error: function () {
				},
			};
		}

		this.pcsc.on('reader', (reader) => {

			this.logger.debug('new reader detected', reader.name);

			// create special object for ARC122U reader with commands specific to this reader
			if (

				// 'acr122' matches ARC122U
				reader.name.toLowerCase().indexOf('acr122') !== -1

				// 'acr125' matches ACR1252U reader because ACR1252U has some common commands with ARC122U
				//   ACR1252U product page: https://www.acs.com.hk/en/products/342/acr1252u-usb-nfc-reader-iii-nfc-forum-certified-reader/
				//   TODO: in the future, this should be refactored:
				//         see discussion in PR#111 https://github.com/pokusew/nfc-pcsc/pull/111
				|| reader.name.toLowerCase().indexOf('acr125') !== -1

			) {

				const device = new ACR122Reader(reader, this.logger);

				this.emit('reader', device);

				return;

			}

			const device = new Reader(reader, this.logger);

			this.emit('reader', device);

		});

		this.pcsc.on('error', (err) => {

			this.logger.error('PCSC error', err.message);

			this.emit('error', err);

		});

	}

	get readers() {
		return this.pcsc.readers;
	}

	close() {
		this.pcsc.close();
	}

}

export default NFC;
