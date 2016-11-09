"use strict";

import EventEmitter from 'events';


export const TAG_ISO_14443_3 = 'TAG_ISO_14443_3';
export const TAG_ISO_14443_4 = 'TAG_ISO_14443_4';


class Reader extends EventEmitter {

	reader = null;
	logger = null;

	card = null;

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

			this.logger.error(err);

			this.emit('error', err);

		});

		this.reader.on('status', (status) => {

			this.logger.debug('status', status);

			// check what has changed
			const changes = this.reader.state ^ status.state;

			this.logger.debug('changes', changes);

			if (changes) {

				if ((changes & this.reader.SCARD_STATE_EMPTY) && (status.state & this.reader.SCARD_STATE_EMPTY)) {

					this.logger.info('card removed');
					this.disconnect();

				}
				else if ((changes & this.reader.SCARD_STATE_PRESENT) && (status.state & this.reader.SCARD_STATE_PRESENT)) {

					const atr = status.atr;

					this.logger.info('card inserted', atr);

					this.card = {};

					if (atr) {

						this.card.atr = atr;
						this.card.standard = Reader.selectStandardByAtr(atr);

					}

					this.connect();

				}
			}
		});

		this.reader.on('end', () => {

			this.logger.info('reader removed');

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

	connect() {

		if (!this.card) {
			return false;
		}

		this.logger.info('trying to connect card', this.card);

		// connect card
		this.reader.connect({ share_mode: this.reader.SCARD_SHARE_SHARED }, (err, protocol) => {

			if (err) {
				this.emit('error', err);
				return;
			}

			this.card.protocol = protocol;

			this.logger.info('card connected', protocol);

			if (!this.autoProcessing) {

				this.emit('card', this.card);
				return;

			}

			this.handleTag();

		});

	}

	disconnect() {

		if (!this.card) {
			return false;
		}

		this.logger.info('trying to disconnect card', this.card);

		// disconnect removed
		this.reader.disconnect(this.reader.SCARD_LEAVE_CARD, (err) => {

			if (err) {
				this.emit('error', err);
				return;
			}

			this.card = null;

			this.logger.info('card disconnected');

		});

	}

	read(blockNumber, length, blockSize = 4, packetSize = 16) {

		if (!this.card) {
			return false;
		}

		this.logger.info('reading data from card', this.card);

		if (length > packetSize) {

			const p = Math.ceil(length / packetSize);

			const commands = [];

			for (let i = 0; i < p; i++) {

				const block = blockNumber + ((i * packetSize) / blockSize);

				const size = ((i + 1) * packetSize) < length ? packetSize : length - ((i) * packetSize);

				// console.log(i, block, size);

				commands.push(this.read(block, size, blockSize, packetSize));

			}

			return Promise.all(commands)
				.then(values => {
					// console.log(values);
					return Buffer.concat(values, length);
				});

		}

		// Read Binary Blocks
		let packet = new Buffer([
			0xff, // Class
			0xb0, // Ins
			0x00, // P1
			blockNumber, // P2: Block Number
			length  // Le: Number of Bytes to Read (Maximum 16 bytes)
		]);

		return new Promise((resolve, reject) => {

			this.reader.transmit(packet, length + 2, this.card.protocol, (err, response) => {

				if (err) {
					reject(err);
					return;
				}

				this.logger.info('response received', response);

				const code = parseInt(response.slice(-2).toString('hex'), 16);

				if (code !== 0x9000) {
					const err = new Error(`the operation failed`);
					reject(err);
					return;
				}

				const data = response.slice(0, -2);

				this.logger.info('data', data);

				resolve(data);

			});

		});

	}

	write(blockNumber, data, blockSize = 4) {

		if (!this.card) {
			return false;
		}

		this.logger.info('writing data to card', this.card);

		if (data.length < blockSize || data.length % blockSize !== 0) {
			throw new Error('Invalid data length. You can only update the entire data block(s).');
		}

		if (data.length > blockSize) {

			const p = data.length / blockSize;

			const commands = [];

			for (let i = 0; i < p; i++) {

				const block = blockNumber + i;

				const start = i * blockSize;
				const end = (i + 1) * blockSize;

				const part = data.slice(start, end);

				// console.log(i, block, start, end, part);

				commands.push(this.write(block, part, blockSize));

			}

			return Promise.all(commands)
				.then(values => {
					// console.log(values);
					return values;
				});

		}

		// Update Binary Block
		const packet = new Buffer([
			0xff, // Class
			0xd6, // Ins
			0x00, // P1
			blockNumber, // P2: Block Number
			blockSize, // Le: Number of Bytes to Update
		]);

		const message = Buffer.concat([packet, data]);

		return new Promise((resolve, reject) => {

			this.reader.transmit(message, 2, this.card.protocol, (err, response) => {

				if (err) {
					reject(err);
					return;
				}

				this.logger.info('response received', response);

				const code = response.readUInt16BE(0);

				if (code !== 0x9000) {
					const err = new Error(`the operation failed`);
					reject(err);
					return;
				}

				resolve(true);

			});

		});

	}

	transmit(data, responseMaxLength, cb) {

		if (!this.card || !this.card.protocol) {
			return false;
		}

		return this.reader.transmit(data, responseMaxLength, this.card.protocol, cb);

	}

	handleTag() {

		if (!this.card) {
			return false;
		}

		this.logger.info('handling tag', this.card);

		switch (this.card.standard) {

			case TAG_ISO_14443_3:
				return this.handle_Iso_14443_3_Tag();

			case TAG_ISO_14443_4:
				return this.handle_Iso_14443_4_Tag();

			default:
				return this.handle_Iso_14443_3_Tag();

		}

	}

	handle_Iso_14443_3_Tag() {

		if (!this.card || !this.card.protocol) {
			return false;
		}

		this.logger.info('processing ISO 14443-3 tag', this.card);

		let packet = new Buffer([
			0xff, // Class
			0xca, // Ins
			0x00, // P1: Get current card UID
			0x00, // P2
			0x00  // Le
		]);

		this.reader.transmit(packet, 12, this.card.protocol, (err, response) => {

			if (err) {
				this.emit('error', err);
				return;
			}

			this.logger.info('Response received', response);

			if (response.length < 2) {

				const err = new Error(`Invalid response length ${response.length}. Expected minimal length was 2 bytes.`);
				this.emit('error', err);

				return;
			}

			// last 2 bytes are the status code
			const error = response.slice(-2).readUInt16BE(0);

			// an error occurred
			if (error !== 0x9000) {

				const err = new Error(`Response status error.`);
				this.emit('error', err);

				return;
			}

			// strip out the status code (the rest is UID)
			let uid = response.slice(0, -2).toString('hex');
			// let uidReverse = Reader.reverseBuffer(response.slice(0, -2)).toString('hex');

			this.emit('card', {
				type: TAG_ISO_14443_3,
				uid: uid
			});


		});
	}

	handle_Iso_14443_4_Tag() {

		if (!this.card || !this.card.protocol) {
			return false;
		}

		this.logger.info('processing ISO 14443-4 tag', this.card);

		if (!this._parsedAid) {
			const err = new Error('Cannot process ISO 14443-4 tag because AID was not set.');
			this.emit.error(err);
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

		this.reader.transmit(message, 40, this.card.protocol, (err, response) => {

			if (err) {
				this.emit('error', err);
				return;
			}

			this.logger.info('Response received', response);

			if (response.length === 2 && response.readUInt16BE(0) === 0x6a82) {

				const err = new Error(`Not found response. Tag not compatible with AID ${this._aid}.`);
				this.emit('error', err);

				return;
			}

			if (response.length < 2) {

				const err = new Error(`Invalid response length ${response.length}. Expected minimal length was 2 bytes.`);
				this.emit('error', err);

				return;
			}

			// another possibility let error = parseInt(response.slice(-2).toString('hex'), 16)
			let error = response.slice(-2).readUInt16BE(0);

			// an error occurred
			if (error !== 0x9000) {

				const err = new Error(`Response status error.`);
				this.emit('error', err);

				return;
			}

			// strip out the status code
			let data = response.slice(0, -2);

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
