"use strict";

import Reader from './Reader';
import {
	ConnectError,
	DisconnectError,
	TransmitError,
	ControlError,
	AuthenticationError,
	LoadAuthenticationKeyError,
	ReadError,
	WriteError,
	GetUIDError,
	CARD_NOT_CONNECTED,
	OPERATION_FAILED,
	UNKNOWN_ERROR,
	FAILURE,
} from './errors';


class ACR122Reader extends Reader {

	async inAutoPoll() {

		const payload = [
			0xD4,
			0x60,
			0xFF, // PollNr (0xFF = Endless polling)
			0x01, // Period (0x01 – 0x0F) indicates the polling period in units of 150 ms
			0x00, // Type 1 0x00 = Generic passive 106 kbps (ISO/IEC14443-4A, Mifare and DEP)
		];

		// CMD: Direct Transmit (to inner PN532 chip InAutoPoll CMD)
		const packet = Buffer.from([
			0xff, // Class
			0x00, // INS
			0x00, // P1
			0x00, // P2
			payload.length, // Lc: Number of Bytes to send (Maximum 255 bytes)
			...payload,
		]);

		console.log(packet);

		let response = null;

		try {

			response = await this.control(packet, 2);

			this.logger.debug('response received', response);

			// Red OFF Green OFF  0x00
			// Red ON  Green OFF  0x01
			// Red OFF Green ON   0x02
			// Red ON  Green ON   0x03

			console.log(response.slice(1));


		} catch (err) {

			throw err;

		}

		// const statusCode = response.readUInt16BE(0);
		//
		// if (statusCode !== 0x9000) {
		// 	//throw new LoadAuthenticationKeyError(OPERATION_FAILED, `Load authentication key operation failed: Status code: ${statusCode}`);
		// }

	}

	async led(led, blinking) {

		// P2: LED State Control (1 byte = 8 bits)
		// format:
		/*
		 +-----+----------------------------------+-------------------------------------+
		 | Bit |               Item               |             Description             |
		 +-----+----------------------------------+-------------------------------------+
		 |   0 | Final Red LED State              | 1 = On; 0 = Off                     |
		 |   1 | Final Green LED State            | 1 = On; 0 = Off                     |
		 |   2 | Red LED State Mask               | 1 = Update the State; 0 = No change |
		 |   3 | Green LED State Mask             | 1 = Update the State; 0 = No change |
		 |   4 | Initial Red LED Blinking State   | 1 = On; 0 = Off                     |
		 |   5 | Initial Green LED Blinking State | 1 = On; 0 = Off                     |
		 |   6 | Red LED Blinking Mask            | 1 = Blink; 0 = Not Blink            |
		 |   7 | Green LED Blinking Mask          | 1 = Blink; 0 = Not Blink            |
		 +-----+----------------------------------+-------------------------------------+
		 */

		//const led = 0b00001111;
		//const led = 0x50;

		// Data In: Blinking Duration Control (4 bytes)
		// Byte 0: T1 Duration Initial Blinking State (Unit = 100 ms)
		// Byte 1: T2 Duration Toggle Blinking State (Unit = 100 ms)
		// Byte 2: Number of repetition
		// Byte 3: Link to Buzzer
		// - 00: The buzzer will not turn on
		// - 01: The buzzer will turn on during the T1 Duration
		// - 02: The buzzer will turn on during the T2 Duration
		// - 03: The buzzer will turn on during the T1 and T2 Duration

		// const blinking = [
		// 	0x00,
		// 	0x00,
		// 	0x00,
		// 	0x00
		// ];


		// CMD: Bi-Color LED and Buzzer Control
		const packet = Buffer.from([
			0xff, // Class
			0x00, // INS
			0x40, // P1
			led, // P2: LED State Control
			0x04, // Lc
			...blinking, // Data In: Blinking Duration Control (4 bytes)
		]);

		console.log(packet);

		let response = null;

		try {

			response = await this.control(packet, 2);

			this.logger.debug('response received', response);

			// Red OFF Green OFF  0x00
			// Red ON  Green OFF  0x01
			// Red OFF Green ON   0x02
			// Red ON  Green ON   0x03

			console.log(response.slice(1));


		} catch (err) {

			throw err;

		}

		// const statusCode = response.readUInt16BE(0);
		//
		// if (statusCode !== 0x9000) {
		// 	//throw new LoadAuthenticationKeyError(OPERATION_FAILED, `Load authentication key operation failed: Status code: ${statusCode}`);
		// }

	}

	async setBuzzerOutput(enabled = true) {


		// CMD: Set Buzzer Output Enable for Card Detection
		const packet = Buffer.from([
			0xff, // Class
			0x00, // INS
			0x52, // P1
			enabled ? 0xff : 0x00, // P2: PollBuzzStatus
			0x00, // Le
		]);

		console.log(packet);

		let response = null;

		try {

			response = await this.control(packet, 2);

			this.logger.debug('response received', response);


		} catch (err) {

			throw err;

		}

		const statusCode = response.readUInt16BE(0);

		if (statusCode !== 0x9000) {
			//throw new LoadAuthenticationKeyError(OPERATION_FAILED, `Load authentication key operation failed: Status code: ${statusCode}`);
		}

	}

	async setPICC(picc) {

		// just enable Auto ATS Generation
		// const picc = 0b01000000;

		// CMD: Set PICC Operating Parameter
		const packet = Buffer.from([
			0xff, // Class
			0x00, // INS
			0x51, // P1
			picc, // P2: New PICC Operating Parameter
			0x00, // Le
		]);

		console.log(packet);

		let response = null;

		try {

			response = await this.control(packet, 1);

			this.logger.debug('response received', response);


		} catch (err) {

			throw err;

		}

		// const statusCode = response.readUInt16BE(0);
		//
		// if (statusCode !== 0x9000) {
		// 	//throw new LoadAuthenticationKeyError(OPERATION_FAILED, `Load authentication key operation failed: Status code: ${statusCode}`);
		// }

	}

}

export default ACR122Reader;
