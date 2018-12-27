"use strict";

import EventEmitter from 'events';


class MockPCSC extends EventEmitter {

	constructor(name) {
		super();
	}

	simulateReader(reader) {
		this.emit('reader', reader);
	}

}


class MockReader extends EventEmitter {

	name = null;

	constructor(name) {
		super();
		this.name = name || 'MockReader';
	}

	simulateCard(card) {
		this.emit('card', card);
	}

}


class MockCard extends EventEmitter {

	constructor() {
		super();
	}

}


export default function () {

	return new MockPCSC();

}
