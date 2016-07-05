"use strict";

import EventEmitter from 'events';


export const TAG_ISO_14443_3 = 'TAG_ISO_14443_3';
export const TAG_ISO_14443_4 = 'TAG_ISO_14443_4';


class Reader extends EventEmitter {

	reader = null;
	logger = null;

	autoProcessing = true;
	_aid = null;
	_parsedAid = null;

	get aid() {
		return this._aid;
	}

	set aid(value) {

		this.logger.info('Setting AID to', value);
		this._aid = value;

		const parsedAid = Reader.parseAid(value);
		this.logger.info('AID parsed', parsedAid);
		this._parsedAid = parsedAid;

	}

	get name() {
		return this.reader.name;
	}

	constructor(reader, logger) {

		super();

		this.reader = reader;

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

		this.reader.on('error', (err) => {

			this.logger.error('Error(', this.reader.name, '):', err.message);

			this.emit('error', err);

		});

		this.reader.on('status', (status) => {

			this.logger.debug('Status(', this.reader.name, '):', status);

			// check what has changed
			const changes = this.reader.state ^ status.state;

			this.logger.debug('Changes(', this.reader.name, '):', changes);

			if (changes) {

				if ((changes & this.reader.SCARD_STATE_EMPTY) && (status.state & this.reader.SCARD_STATE_EMPTY)) {

					this.logger.info('card removed');

					// card removed
					reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
						if (err) {
							this.logger.info(err);
						} else {
							this.logger.info('Disconnected');
						}
					});

				} else if ((changes & this.reader.SCARD_STATE_PRESENT) && (status.state & this.reader.SCARD_STATE_PRESENT)) {

					const atr = status.atr;

					this.logger.info('card inserted', atr);

					if (!this.autoProcessing) {
						this.emit('cardInserted', status);
						return;
					}

					// card inserted
					this.reader.connect({share_mode: this.reader.SCARD_SHARE_SHARED}, (err, protocol) => {

						if (err) {
							this.logger.error(err);
							return;
						}

						this.logger.info('Protocol(', this.reader.name, '):', protocol);

						if (atr && Reader.selectStandardByAtr(atr) === TAG_ISO_14443_4) {
							this.handle_Iso_14443_4_Tag(protocol);
						}
						else {
							this.handle_Iso_14443_3_Tag(protocol);
						}

					});

				}
			}
		});

		this.reader.on('end', () => {

			this.logger.info('Reader', this.reader.name, 'removed');

			this.emit('end');

		});

	}

	static reverseBuffer(src) {

		let buffer = new Buffer(src.length);

		for (var i = 0, j = src.length - 1; i <= j; ++i, --j) {
			buffer[i] = src[j];
			buffer[j] = src[i];
		}

		return buffer;

	}

	static parseAid(str) {

		let result = [];

		for (let i = 0; i < str.length; i += 2) {
			result.push(parseInt(str.substr(i, 2), 16));
		}

		return result;

	}

	static selectStandardByAtr(atr) {

		// TODO: better detecting card types
		if (atr[5] && atr[5] === 0x4f) {
			return TAG_ISO_14443_3;
		}
		else {
			return TAG_ISO_14443_4;
		}

	}

	handle_Iso_14443_3_Tag(protocol) {

		this.logger.info('processing ISO 14443-3 tag');

		let packet = new Buffer([
			0xff, // Class
			0xca, // Ins
			0x00, // P1: Get current card UID
			0x00, // P2
			0x00  // Le
		]);

		this.reader.transmit(packet, 9, protocol, (err, response) => {

			if (err) {
				this.logger.info(err);
				this.emit('error', err);
				return;
			}

			this.logger.info('Response received', response);

			if (response.length !== 9) {

				const err = new Error(`Invalid response length ${response.length}. Expected length was 9 bytes.`);
				this.logger.error(err);
				this.emit('error', err);

				return;
			}

			const error = response.readUInt16BE(7);

			// an error occurred
			if (error !== 0x9000) {

				const err = new Error(`Response status error.`);
				this.logger.error(err);
				this.emit('error', err);

				return;
			}

			let uid = response.slice(0, 7).toString('hex');
			let uidReverse = Reader.reverseBuffer(response.slice(0, 7)).toString('hex');

			this.emit('card', {
				type: TAG_ISO_14443_3,
				uid: uid
			});


		});
	}

	handle_Iso_14443_4_Tag(protocol) {

		this.logger.info('processing ISO 14443-4 tag');

		if (!this._parsedAid) {
			this.logger.error('cannot process ISO 14443-4 tag because AID was not set');
		}

		let packet = Buffer.from([
			0x00, // Class
			0xa4, // Ins
			0x04, // P1
			0x00, // P2
			0x05  // LE
		]);


		let aid = Buffer.from(this._parsedAid);

		let message = Buffer.concat([packet, aid]);

		this.reader.transmit(message, 40, protocol, (err, response) => {

			if (err) {
				this.logger.error(err);
				this.emit('error', err);
				return;
			}

			this.logger.info('Response received', response);

			if (response.length === 2 && response.readUInt16BE(0) === 0x6a82) {

				const err = new Error(`Not found response. Tag not compatible with AID ${this._aid}.`);
				this.logger.error(err);
				this.emit('error', err);

				return;
			}

			if (response.length !== 9) {

				const err = new Error(`Invalid response length ${response.length}. Expected length was 9 bytes.`);
				this.logger.error(err);
				this.emit('error', err);

				return;
			}

			// another possibility let error = parseInt(response.slice(-2).toString('hex'), 16)
			let error = response.readUInt16BE(7);

			// an error occurred
			if (error !== 0x9000) {

				const err = new Error(`Response status error.`);
				this.logger.error(err);
				this.emit('error', err);

				return;
			}


			let data = response.slice(0, 7);

			this.logger.info('Data cropped', data);

			this.emit('card', {
				type: TAG_ISO_14443_4,
				data: data
			});


		});
	}

	close() {

		this.reader.close();

	}

}

export default Reader;
