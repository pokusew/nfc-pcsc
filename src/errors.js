"use strict";


export const UNKNOWN_ERROR = 'unknown_error';

export class BaseError extends Error {

	constructor(code, message, previousError) {

		super(message);

		Error.captureStackTrace(this, this.constructor);

		this.name = 'BaseError';

		if (!message && previousError) {
			this.message = previousError.message;
		}

		this.code = code;

		if (previousError) {
			this.previous = previousError;
		}

	}

}

export const FAILURE = 'failure';
export const CARD_NOT_CONNECTED = 'card_not_connected';
export const OPERATION_FAILED = 'operation_failed';

export class TransmitError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'TransmitError';

	}

}

export class ControlError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'ControlError';

	}

}

export class ReadError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'ReadError';

	}

}

export class WriteError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'WriteError';

	}

}

export class LoadAuthenticationKeyError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'LoadAuthenticationKeyError';

	}

}

export class AuthenticationError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'AuthenticationError';

	}

}

export class ConnectError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'ConnectError';

	}

}

export class DisconnectError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'DisconnectError';

	}

}

export class GetUIDError extends BaseError {

	constructor(code, message, previousError) {

		super(code, message, previousError);

		this.name = 'GetUIDError';

	}

}
