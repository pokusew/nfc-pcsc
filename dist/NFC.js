"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pcsclite = require("@matyulabz/pcsclite");

var _pcsclite2 = _interopRequireDefault(_pcsclite);

var _events = require("events");

var _events2 = _interopRequireDefault(_events);

var _Reader = require("./Reader");

var _Reader2 = _interopRequireDefault(_Reader);

var _ACR122Reader = require("./ACR122Reader");

var _ACR122Reader2 = _interopRequireDefault(_ACR122Reader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class NFC extends _events2.default {
  constructor(logger) {
    super();
    this.pcsc = null;
    this.logger = null;
    this.pcsc = (0, _pcsclite2.default)();

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

    this.pcsc.on('reader', reader => {
      this.logger.info('New reader detected', reader.name); // create special object for ARC122U reader with commands specific to this reader

      if (reader.name.toLowerCase().indexOf('acr122') !== -1) {
        const device = new _ACR122Reader2.default(reader, this.logger);
        this.emit('reader', device);
        return;
      }

      const device = new _Reader2.default(reader, this.logger);
      this.emit('reader', device);
    });
    this.pcsc.on('error', err => {
      this.logger.info('PCSC error', err.message);
      this.emit('error', err);
    });
  }

  close() {
    this.pcsc.close();
  }

}

exports.default = NFC;