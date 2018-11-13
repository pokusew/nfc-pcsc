"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CONNECT_MODE_CARD = exports.CONNECT_MODE_DIRECT = exports.KEY_TYPE_B = exports.KEY_TYPE_A = exports.TAG_ISO_14443_4 = exports.TAG_ISO_14443_3 = undefined;

var _events = require("events");

var _events2 = _interopRequireDefault(_events);

var _errors = require("./errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const TAG_ISO_14443_3 = exports.TAG_ISO_14443_3 = 'TAG_ISO_14443_3';
const TAG_ISO_14443_4 = exports.TAG_ISO_14443_4 = 'TAG_ISO_14443_4';
const KEY_TYPE_A = exports.KEY_TYPE_A = 0x60;
const KEY_TYPE_B = exports.KEY_TYPE_B = 0x61;
const CONNECT_MODE_DIRECT = exports.CONNECT_MODE_DIRECT = 'CONNECT_MODE_DIRECT';
const CONNECT_MODE_CARD = exports.CONNECT_MODE_CARD = 'CONNECT_MODE_CARD';

class Reader extends _events2.default {
  static reverseBuffer(src) {
    const buffer = new Buffer(src.length);

    for (let i = 0, j = src.length - 1; i <= j; ++i, --j) {
      buffer[i] = src[j];
      buffer[j] = src[i];
    }

    return buffer;
  }

  static parseAid(str) {
    const result = [];

    for (let i = 0; i < str.length; i += 2) {
      result.push(parseInt(str.substr(i, 2), 16));
    }

    return result;
  }

  static selectStandardByAtr(atr) {
    // TODO: better detecting card types
    if (atr[5] && atr[5] === 0x4f) {
      return TAG_ISO_14443_3;
    } else {
      return TAG_ISO_14443_4;
    }
  }

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
    var _this;

    _this = super();
    this.reader = null;
    this.logger = null;
    this.connection = null;
    this.card = null;
    this.autoProcessing = true;
    this._aid = null;
    this._parsedAid = null;
    this.keyStorage = {
      '0': null,
      '1': null
    };
    this.pendingLoadAuthenticationKey = {};
    this.reader = reader;

    if (logger) {
      this.logger = logger;
    } else {
      this.logger = {
        log: function () {},
        debug: function () {},
        info: function () {},
        warn: function () {},
        error: function () {}
      };
    }

    this.reader.on('error', err => {
      this.logger.error(err);
      this.emit('error', err);
    });
    this.reader.on('status', (() => {
      var _ref = _asyncToGenerator(function* (status) {
        _this.logger.debug('status', status); // check what has changed


        const changes = _this.reader.state ^ status.state;

        _this.logger.debug('changes', changes);

        if (changes) {
          if (changes & _this.reader.SCARD_STATE_EMPTY && status.state & _this.reader.SCARD_STATE_EMPTY) {
            _this.logger.info('card removed');

            if (_this.card) {
              _this.emit('card.off', { ..._this.card
              });
            }

            try {
              _this.card = null;

              if (_this.connection) {
                yield _this.disconnect();
              }
            } catch (err) {
              _this.emit(err);
            }
          } else if (changes & _this.reader.SCARD_STATE_PRESENT && status.state & _this.reader.SCARD_STATE_PRESENT) {
            const atr = status.atr;

            _this.logger.info('card inserted', atr);

            _this.card = {};

            if (atr) {
              _this.card.atr = atr;
              _this.card.standard = Reader.selectStandardByAtr(atr);
              _this.card.type = _this.card.standard;
            }

            try {
              yield _this.connect();

              if (!_this.autoProcessing) {
                _this.emit('card', _this.card);

                return;
              }

              _this.handleTag();
            } catch (err) {
              _this.emit(err);
            }
          }
        }
      });

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    })());
    this.reader.on('end', () => {
      this.logger.info('reader removed');
      this.emit('end');
    });
  }

  connect(mode = CONNECT_MODE_CARD) {
    const modes = {
      [CONNECT_MODE_DIRECT]: this.reader.SCARD_SHARE_DIRECT,
      [CONNECT_MODE_CARD]: this.reader.SCARD_SHARE_SHARED
    };

    if (!modes[mode]) {
      throw new _errors.ConnectError('invalid_mode', 'Invalid mode');
    }

    this.logger.info('trying to connect', mode, modes[mode]);
    return new Promise((resolve, reject) => {
      // connect card
      this.reader.connect({
        share_mode: modes[mode] //protocol: this.reader.SCARD_PROTOCOL_UNDEFINED

      }, (err, protocol) => {
        if (err) {
          const error = new _errors.ConnectError(_errors.FAILURE, 'An error occurred while connecting.', err);
          this.logger.error(error);
          return reject(error);
        }

        this.connection = {
          type: modes[mode],
          protocol: protocol
        };
        this.logger.info('connected', this.connection);
        return resolve(this.connection);
      });
    });
  }

  disconnect() {
    if (!this.connection) {
      throw new _errors.DisconnectError('not_connected', 'Reader in not connected. No need for disconnecting.');
    }

    this.logger.info('trying to disconnect', this.connection);
    return new Promise((resolve, reject) => {
      // disconnect removed
      this.reader.disconnect(this.reader.SCARD_LEAVE_CARD, err => {
        if (err) {
          const error = new _errors.DisconnectError(_errors.FAILURE, 'An error occurred while disconnecting.', err);
          this.logger.error(error);
          return reject(error);
        }

        this.connection = null;
        this.logger.info('disconnected');
        return resolve(true);
      });
    });
  }

  transmit(data, responseMaxLength) {
    if (!this.card || !this.connection) {
      throw new _errors.TransmitError(_errors.CARD_NOT_CONNECTED, 'No card or connection available.');
    }

    return new Promise((resolve, reject) => {
      this.logger.log('transmitting', data, responseMaxLength);
      this.reader.transmit(data, responseMaxLength, this.connection.protocol, (err, response) => {
        if (err) {
          const error = new _errors.TransmitError(_errors.FAILURE, 'An error occurred while transmitting.', err);
          return reject(error);
        }

        return resolve(response);
      });
    });
  }

  control(data, responseMaxLength) {
    if (!this.connection) {
      throw new _errors.ControlError('not_connected', 'No connection available.');
    }

    return new Promise((resolve, reject) => {
      this.logger.log('transmitting control', data, responseMaxLength);
      this.reader.control(data, this.reader.IOCTL_CCID_ESCAPE, responseMaxLength, (err, response) => {
        if (err) {
          const error = new _errors.ControlError(_errors.FAILURE, 'An error occurred while transmitting control.', err);
          return reject(error);
        }

        return resolve(response);
      });
    });
  }

  loadAuthenticationKey(keyNumber, key) {
    return _asyncToGenerator(function* () {
      if (!(keyNumber === 0 || keyNumber === 1)) {
        throw new _errors.LoadAuthenticationKeyError('invalid_key_number');
      }

      const keyData = Reader.parseAid(key);

      if (keyData.length !== 6) {
        throw new _errors.LoadAuthenticationKeyError('invalid_key');
      } // CMD: Load Authentication Keys


      const packet = new Buffer([0xff, // Class
      0x82, // INS
      0x00, // P1: Key Structure (0x00 = Key is loaded into the reader volatile memory.)
      keyNumber, // P2: Key Number (00h ~ 01h = Key Location. The keys will disappear once the reader is disconnected from the PC)
      0x06, // Lc
      // Data In: Key (6 bytes)
      ...keyData]);
      let response = null;

      try {
        response = yield this.transmit(packet, 2);
        this.logger.info('response received', response);
      } catch (err) {
        throw new _errors.LoadAuthenticationKeyError(null, null, err);
      }

      const statusCode = response.readUInt16BE(0);

      if (statusCode !== 0x9000) {
        throw new _errors.LoadAuthenticationKeyError(_errors.OPERATION_FAILED, `Load authentication key operation failed: Status code: ${statusCode}`);
      }

      this.keyStorage[keyNumber] = key;
      return keyNumber;
    })();
  } // for PC/SC V2.01 use obsolete = true
  // for PC/SC V2.07 use obsolete = false [default]


  authenticate(blockNumber, keyType, key, obsolete = false) {
    return _asyncToGenerator(function* () {
      var _this2 = this;

      let keyNumber = Object.keys(this.keyStorage).find(function (n) {
        return _this2.keyStorage[n] === key;
      }); // key is not in the storage

      if (!keyNumber) {
        // If there isn't already an authentication process happening for this key, start it
        if (!this.pendingLoadAuthenticationKey[key]) {
          // set key number to first
          keyNumber = Object.keys(this.keyStorage)[0]; // if this number is not free

          if (this.keyStorage[keyNumber] !== null) {
            // try to find any free number
            const freeNumber = Object.keys(this.keyStorage).find(function (n) {
              return _this2.keyStorage[n] === null;
            }); // if we find, we use it, otherwise the first will be used and rewritten

            if (freeNumber) {
              keyNumber = freeNumber;
            }
          } // Store the authentication promise in case other blocks are in process of authentication


          this.pendingLoadAuthenticationKey[key] = this.loadAuthenticationKey(parseInt(keyNumber), key);
        }

        try {
          keyNumber = yield this.pendingLoadAuthenticationKey[key];
        } catch (err) {
          throw new _errors.AuthenticationError('unable_to_load_key', 'Could not load authentication key into reader.', err);
        } finally {
          // remove the loadAuthenticationKey Promise from pendingLoadAuthenticationKey
          // as it is already resolved or rejected at this point
          delete this.pendingLoadAuthenticationKey[key];
        }
      }

      const packet = !obsolete ? // CMD: Authentication
      new Buffer([0xff, // Class
      0x86, // INS
      0x00, // P1
      0x00, // P2
      0x05, // Lc
      // Data In: Authenticate Data Bytes (5 bytes)
      0x01, // Byte 1: Version
      0x00, // Byte 2
      blockNumber, // Byte 3: Block Number
      keyType, // Byte 4: Key Type
      keyNumber]) : // CMD: Authentication (obsolete)
      new Buffer([0xff, // Class
      0x88, // INS
      0x00, // P1
      blockNumber, // P2: Block Number
      keyType, // P3: Key Type
      keyNumber // Data In: Key Number
      ]);
      let response = null;

      try {
        response = yield this.transmit(packet, 2);
        this.logger.info('response received', response);
      } catch (err) {
        throw new _errors.AuthenticationError(null, null, err);
      }

      const statusCode = response.readUInt16BE(0);

      if (statusCode !== 0x9000) {
        this.logger.error('[authentication operation failed][request packet]', packet);
        throw new _errors.AuthenticationError(_errors.OPERATION_FAILED, `Authentication operation failed: Status code: 0x${statusCode.toString(16)}`);
      }

      return true;
    })();
  }

  read(blockNumber, length, blockSize = 4, packetSize = 16) {
    return _asyncToGenerator(function* () {
      if (!this.card) {
        throw new _errors.ReadError(_errors.CARD_NOT_CONNECTED);
      }

      this.logger.info('reading data from card', this.card);

      if (length > packetSize) {
        const p = Math.ceil(length / packetSize);
        const commands = [];

        for (let i = 0; i < p; i++) {
          const block = blockNumber + i * packetSize / blockSize;
          const size = (i + 1) * packetSize < length ? packetSize : length - i * packetSize; // console.log(i, block, size);

          commands.push(this.read(block, size, blockSize, packetSize));
        }

        return Promise.all(commands).then(function (values) {
          // console.log(values);
          return Buffer.concat(values, length);
        });
      } // APDU CMD: Read Binary Blocks


      const packet = new Buffer([0xff, // Class
      0xb0, // Ins
      0x00, // P1
      blockNumber, // P2: Block Number
      length // Le: Number of Bytes to Read (Maximum 16 bytes)
      ]);
      let response = null;

      try {
        response = yield this.transmit(packet, length + 2);
        this.logger.info('response received', response);
      } catch (err) {
        throw new _errors.ReadError(null, null, err);
      }

      const statusCode = response.slice(-2).readUInt16BE(0);

      if (statusCode !== 0x9000) {
        throw new _errors.ReadError(_errors.OPERATION_FAILED, `Read operation failed: Status code: 0x${statusCode.toString(16)}`);
      }

      const data = response.slice(0, -2);
      this.logger.info('data', data);
      return data;
    })();
  }

  write(blockNumber, data, blockSize = 4) {
    return _asyncToGenerator(function* () {
      if (!this.card) {
        throw new _errors.WriteError(_errors.CARD_NOT_CONNECTED);
      }

      this.logger.info('writing data to card', this.card);

      if (data.length < blockSize || data.length % blockSize !== 0) {
        throw new _errors.WriteError('invalid_data_length', 'Invalid data length. You can only update the entire data block(s).');
      }

      if (data.length > blockSize) {
        const p = data.length / blockSize;
        const commands = [];

        for (let i = 0; i < p; i++) {
          const block = blockNumber + i;
          const start = i * blockSize;
          const end = (i + 1) * blockSize;
          const part = data.slice(start, end); // console.log(i, block, start, end, part);

          commands.push(this.write(block, part, blockSize));
        }

        return Promise.all(commands).then(function (values) {
          // console.log(values);
          return values;
        });
      } // APDU CMD: Update Binary Block


      const packetHeader = new Buffer([0xff, // Class
      0xd6, // Ins
      0x00, // P1
      blockNumber, // P2: Block Number
      blockSize]);
      const packet = Buffer.concat([packetHeader, data]);
      let response = null;

      try {
        response = yield this.transmit(packet, 2);
        this.logger.info('response received', response);
      } catch (err) {
        throw new _errors.WriteError(null, null, err);
      }

      const statusCode = response.readUInt16BE(0);

      if (statusCode !== 0x9000) {
        throw new _errors.WriteError(_errors.OPERATION_FAILED, `Write operation failed: Status code: 0x${statusCode.toString(16)}`);
      }

      return true;
    })();
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
  } // TODO: improve error handling and debugging


  handle_Iso_14443_3_Tag() {
    return _asyncToGenerator(function* () {
      if (!this.card || !this.connection) {
        return false;
      }

      this.logger.info('processing ISO 14443-3 tag', this.card); // APDU CMD: Get Data

      const packet = new Buffer([0xff, // Class
      0xca, // INS
      0x00, // P1: Get current card UID
      0x00, // P2
      0x00 // Le: Full Length of UID
      ]);

      try {
        const response = yield this.transmit(packet, 12);

        if (response.length < 2) {
          const error = new _errors.GetUIDError('invalid_response', `Invalid response length ${response.length}. Expected minimal length was 2 bytes.`);
          this.emit('error', error);
          return;
        } // last 2 bytes are the status code


        const statusCode = response.slice(-2).readUInt16BE(0); // an error occurred

        if (statusCode !== 0x9000) {
          const error = new _errors.GetUIDError(_errors.OPERATION_FAILED, 'Could not get card UID.');
          this.emit('error', error);
          return;
        } // strip out the status code (the rest is UID)


        const uid = response.slice(0, -2).toString('hex'); // const uidReverse = Reader.reverseBuffer(response.slice(0, -2)).toString('hex');

        this.card.uid = uid;
        this.emit('card', { ...this.card
        });
      } catch (err) {
        const error = new _errors.GetUIDError(null, null, err);
        this.emit('error', error);
      }
    })();
  } // TODO: improve error handling and debugging


  handle_Iso_14443_4_Tag() {
    return _asyncToGenerator(function* () {
      if (!this.card || !this.connection) {
        return false;
      }

      this.logger.info('processing ISO 14443-4 tag', this.card);

      if (!this._parsedAid) {
        const err = new Error('Cannot process ISO 14443-4 tag because AID was not set.');
        this.emit('error', err);
        return;
      } // APDU CMD: Select Apdu


      const packetHeader = Buffer.from([0x00, // Class
      0xa4, // INS
      0x04, // P1
      0x00, // P2
      0x05 // Le
      ]);
      const aid = Buffer.from(this._parsedAid);
      const packet = Buffer.concat([packetHeader, aid]);

      try {
        const response = yield this.transmit(packet, 40);

        if (response.length === 2 && response.readUInt16BE(0) === 0x6a82) {
          const err = new Error(`Not found response. Tag not compatible with AID ${this._aid}.`);
          this.emit('error', err);
          return;
        }

        if (response.length < 2) {
          const err = new Error(`Invalid response length ${response.length}. Expected minimal length was 2 bytes.`);
          this.emit('error', err);
          return;
        } // another possibility const statusCode = parseInt(response.slice(-2).toString('hex'), 16)


        const statusCode = response.slice(-2).readUInt16BE(0); // an error occurred

        if (statusCode !== 0x9000) {
          const err = new Error(`Response status error.`);
          this.emit('error', err);
          return;
        } // strip out the status code


        const data = response.slice(0, -2);
        this.logger.info('Data cropped', data);
        this.emit('card', { ...this.card,
          data: data
        });
      } catch (err) {
        const error = new _errors.GetUIDError(null, null, err);
        this.emit('error', error);
      }
    })();
  }

  close() {
    this.reader.close();
  }

}

exports.default = Reader;