import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import css from 'rollup-plugin-css-only';
import commonjs from '@rollup/plugin-commonjs';

const dev = true;

// const config = [{
// 	input: `index.ts`,
// 	output: {
// 		file: `dist/index.js`,
// 	},
// 	plugins: [svelte()]
// }].concat(["compiler", "bundler"].map(bundleName => ({
// 	input: `src/lib/Repl/workers/${bundleName}/index.js`,
// 	output: {
// 		file: `dist/workers/${bundleName}.js`,
// 		format: "iife"
// 	},
// 	plugins: [resolve(), json(), terser()]
// })));

const config = [{
	input: `index.ts`,
	output: {
		dir: 'dist',
		format: 'cjs',
	},
	plugins: [svelte({
		preprocess: sveltePreprocess(),
	}), resolve(), json(), css({ output: 'bundle.css' }), commonjs()],
}];

console.log("Config ", config);


export default config;
