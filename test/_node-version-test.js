"use strict";

const mock = require('mock-require');

mock('@pokusew/pcsclite', {});

const {
	NFC,
	Reader, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B,
	ACR122Reader,
	UNKNOWN_ERROR,
	FAILURE,
	CARD_NOT_CONNECTED,
	OPERATION_FAILED,
	BaseError,
	TransmitError,
	ControlError,
	ReadError,
	WriteError,
	LoadAuthenticationKeyError,
	AuthenticationError,
	ConnectError,
	DisconnectError,
	GetUIDError
} = require('../dist/index');
