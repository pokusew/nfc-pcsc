"use strict";


// TODO: cover with tests

export const isDefined = value => value !== null && value !== undefined;

export const crop = (string, length, align = 1) => {

	if (string.length <= length) {
		return string;
	}

	if (align === 1 || align === 2) {
		return string.slice(length - string.length);
	}

	if (align === 3) {
		return string.slice(0, -length - string.length);
	}

};

/**
 * Prefixes/suffixes the given string with the given prefix (defaults to '0') to match the given length
 * e.g. '789', length 8 => '00000789'
 * e.g. 'hi', length 5 => '000hi'
 * @param string String
 * @param length Integer desired length
 * @param prefix String string to use as prefix/suffix/padding
 * @param align 1 left / 2 center / 3 right
 * @param finalize function to finalize the padded string
 *                 defaults to crop if desired length is exceeded
 *                 – e.g. when using 2-char or more prefix or center align
 * @return String
 */
export const paddy = (string, length, prefix = '0', align = 1, finalize = crop) => {

	if (string.length >= length) {
		return string;
	}

	while (string.length < length) {
		string = (align === 3 || align === 2 ? prefix : '') + string + (align === 1 || align === 2 ? prefix : '');
	}

	return finalize(string, length, align);

};

export const column = (value, size, align = 1, paddingLeft = 0, paddingRight = 0) => {

	const v = value.toString();
	const s = (isDefined(size) ? size : v.length);

	return paddy('', paddingLeft, ' ') + paddy(v, s, ' ', align) + paddy('', paddingRight, ' ');

};
