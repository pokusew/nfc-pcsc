export const UNKNOWN_ERROR: "unknown_error";
export class BaseError extends Error {
    constructor(code: any, message: any, previousError: any);
    message: any;
    code: any;
    previous: any;
}
export const FAILURE: "failure";
export const CARD_NOT_CONNECTED: "card_not_connected";
export const OPERATION_FAILED: "operation_failed";
export class TransmitError extends BaseError {
}
export class ControlError extends BaseError {
}
export class ReadError extends BaseError {
}
export class WriteError extends BaseError {
}
export class LoadAuthenticationKeyError extends BaseError {
}
export class AuthenticationError extends BaseError {
}
export class ConnectError extends BaseError {
}
export class DisconnectError extends BaseError {
}
export class GetUIDError extends BaseError {
}
