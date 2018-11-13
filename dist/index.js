"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetUIDError = exports.DisconnectError = exports.ConnectError = exports.AuthenticationError = exports.LoadAuthenticationKeyError = exports.WriteError = exports.ReadError = exports.ControlError = exports.TransmitError = exports.BaseError = exports.OPERATION_FAILED = exports.CARD_NOT_CONNECTED = exports.FAILURE = exports.UNKNOWN_ERROR = exports.ACR122Reader = exports.CONNECT_MODE_DIRECT = exports.CONNECT_MODE_CARD = exports.KEY_TYPE_B = exports.KEY_TYPE_A = exports.TAG_ISO_14443_4 = exports.TAG_ISO_14443_3 = exports.Reader = exports.NFC = undefined;

var _NFC = require("./NFC");

var _NFC2 = _interopRequireDefault(_NFC);

var _Reader = require("./Reader");

var _Reader2 = _interopRequireDefault(_Reader);

var _ACR122Reader = require("./ACR122Reader");

var _ACR122Reader2 = _interopRequireDefault(_ACR122Reader);

var _errors = require("./errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.NFC = _NFC2.default;
exports.Reader = _Reader2.default;
exports.TAG_ISO_14443_3 = _Reader.TAG_ISO_14443_3;
exports.TAG_ISO_14443_4 = _Reader.TAG_ISO_14443_4;
exports.KEY_TYPE_A = _Reader.KEY_TYPE_A;
exports.KEY_TYPE_B = _Reader.KEY_TYPE_B;
exports.CONNECT_MODE_CARD = _Reader.CONNECT_MODE_CARD;
exports.CONNECT_MODE_DIRECT = _Reader.CONNECT_MODE_DIRECT;
exports.ACR122Reader = _ACR122Reader2.default;
exports.UNKNOWN_ERROR = _errors.UNKNOWN_ERROR;
exports.FAILURE = _errors.FAILURE;
exports.CARD_NOT_CONNECTED = _errors.CARD_NOT_CONNECTED;
exports.OPERATION_FAILED = _errors.OPERATION_FAILED;
exports.BaseError = _errors.BaseError;
exports.TransmitError = _errors.TransmitError;
exports.ControlError = _errors.ControlError;
exports.ReadError = _errors.ReadError;
exports.WriteError = _errors.WriteError;
exports.LoadAuthenticationKeyError = _errors.LoadAuthenticationKeyError;
exports.AuthenticationError = _errors.AuthenticationError;
exports.ConnectError = _errors.ConnectError;
exports.DisconnectError = _errors.DisconnectError;
exports.GetUIDError = _errors.GetUIDError;