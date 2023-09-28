"use strict";

// run AVA
//   npx ava --match='*foo'
//   ./node_modules/.bin/ava --match='*foo'
// see https://github.com/avajs/ava/blob/main/docs/05-command-line.md

// https://github.com/avajs/ava/blob/main/docs/06-configuration.md
module.exports = {
	// https://github.com/avajs/ava/blob/main/docs/recipes/typescript.md
	extensions: {
		// https://github.com/avajs/ava/blob/main/docs/06-configuration.md#configuring-module-formats
		js: true,
		ts: 'commonjs',
	},
	// extensions: ['.js', '.ts'],
	require: [
		'@babel/register',
	],
	files: [
		'./test/**/*',
	],
	ignoredByWatcher: [
		//
		// some files and directories are ignored by default,
		// see https://github.com/avajs/ava/blob/main/docs/recipes/watch-mode.md#ignoring-changes
		//
		// note:
		//   AVA dependency tracking (https://github.com/avajs/ava/blob/main/docs/recipes/watch-mode.md#dependency-tracking)
		//   currently does not work with native ES modules.
		//   See
		//     https://github.com/avajs/ava/issues/2388
		//     https://github.com/avajs/ava/pull/3123
		//     https://github.com/avajs/ava/issues/2905
		//
		// use the following to debug:
		//   DEBUG=ava:watcher npx ava --watch
		//   or
		//   DEBUG=ava:* npx ava --watch
		//
		'./.idea/',
		'./temp/',
		'./dist/',
	],
};
