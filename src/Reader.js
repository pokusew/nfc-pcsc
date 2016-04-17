"use strict";

import EventEmitter from 'events';

class Reader extends EventEmitter {

	reader = null;
	logger = null;

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
				info: function () {
				},
				warn: function () {
				},
				error: function () {
				}
			};
		}

		this.reader.on('error', (err) => {

			this.logger.info('Error(', this.reader.name, '):', err.message);

			this.emit('error', err);

		});

		this.reader.on('status', (status) => {

			this.logger.info('Status(', this.reader.name, '):', status);

			// check what has changed
			const changes = this.reader.state ^ status.state;

			this.logger.info('Changes(', this.reader.name, '):', changes);


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

					this.logger.info('card inserted');

					// card inserted
					this.reader.connect({share_mode: this.reader.SCARD_SHARE_SHARED}, (err, protocol) => {

						if (err) {
							this.logger.info(err);
						} else {
							this.logger.info('Protocol(', this.reader.name, '):', protocol);
							this.getTagUid(protocol);
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

	getTagUid(protocol) {

		let packet = new Buffer([
			0xff, // Class
			0xca, // Ins
			0x00, // P1: Get current card UID
			0x00, // P2
			0x00  // Le
		]);

		this.reader.transmit(packet, 40, protocol, (err, data) => {

			if (err) {

				this.logger.info(err);

			}
			else {

				this.logger.info('Data received', data);

				let error = data.readUInt16BE(7);

				if (error !== 0x9000) {
					// an error occurred
					return;
				}

				let uid = data.slice(0, 7).toString('hex');
				let uidReverse = Reader.reverseBuffer(data.slice(0, 7)).toString('hex');

				this.emit('card', {
					uid: uid
				});

			}

		});
	}

	close() {

		this.reader.close();

	}

}

export default Reader;