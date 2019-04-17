"use strict";

import { column } from './utils';


// TODO: cover with tests
export class BitSet {

	/**
	 * Creates a new BitSet (bit view for the Buffer instance)
	 * If an existing Buffer instance is given, then it will be used and no additional memory will be allocated.
	 * If an integer is given, then a new Buffer instance will be created allocating specified memory (bitsLength / 8)
	 * @param bitsLength bit length or existing Buffer instance
	 */
	constructor(bitsLength) {
		this.b = (bitsLength instanceof Buffer) ? bitsLength : Buffer.allocUnsafe(bitsLength / 8).fill(0);
	}

	clone() {
		// copies data into new buffer, allocates new memory
		return Buffer.from(this.b);
	}

	get buffer() {
		return this.b;
	}

	static getBufferPos(pos) {
		return Math.trunc(pos / 8);
	}

	static getMask(pos) {
		return 1 << (pos % 8);
	}

	set(pos) {
		this.b[BitSet.getBufferPos(pos)] |= BitSet.getMask(pos);
	}

	test(pos) {
		return (this.b[BitSet.getBufferPos(pos)] & BitSet.getMask(pos)) !== 0;
	}

	clear(pos) {
		this.b[BitSet.getBufferPos(pos)] &= ~BitSet.getMask(pos);
	}

	toggle(pos) {
		this.b[BitSet.getBufferPos(pos)] ^= BitSet.getMask(pos);
	}

	toArray(useBooleans = true) {
		const s = this.b.length * 8;
		const a = [];
		for (let pos = 0; pos < s; pos++) {
			if (useBooleans) {
				a.push(this.test(pos));
			}
			else {
				a.push(this.test(pos) ? 1 : 0);
			}
		}
		return a;
	}

	print(name, appendBlankLine = true) {

		const s = this.b.length * 8;

		let l1 = ' |       data:';
		let l2 = ' |            ';
		let l3 = ' | bit number:';

		for (let pos = s - 1; pos >= 0; pos--) {
			// console.log(pos);
			const numberString = column(pos, null, 3, 1);
			l1 += column(this.test(pos) ? 1 : 0, numberString.length - 1, 3, 1);
			l2 += column('↑', numberString.length - 1, 3, 1);
			l3 += numberString;
		}

		console.log(`BitSet:${name ? ' ' + name : ''}`, this.b);
		console.log(l1);
		console.log(l2);
		console.log(l3);
		if (appendBlankLine) {
			console.log();
		}

	}

}
