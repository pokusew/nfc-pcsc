"use strict";

import pcsclite from '@pokusew/pcsclite';
import EventEmitter from 'events';
import Reader from './Reader';
import ACR122Reader from './ACR122Reader';


export * from './Reader';
export * from './errors';


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
				}
			};
		}

		this.pcsc.on('reader', (reader) => {

			this.logger.info('New reader detected', reader.name);

			// create special object for ARC122U reader with commands specific to this reader
			if (reader.name.toLowerCase().indexOf('acr122') !== -1) {

				const device = new ACR122Reader(reader, this.logger);

				this.emit('reader', device);

				return;

			}

			const device = new Reader(reader, this.logger);

			this.emit('reader', device);

		});

		this.pcsc.on('error', (err) => {

			this.logger.info('PCSC error', err.message);

			this.emit('error', err);

		});

	}

	close() {

		this.pcsc.close();

	}

}

export default NFC;
