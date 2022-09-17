import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";

const dev = true;

// bundle workers
export default ["compiler", "bundler"].map(x => ({
	input: `src/lib/Repl/workers/${x}/index.js`,
	output: {
		file: `public/workers/${x}.js`,
		format: "iife"
	},
	plugins: [resolve(), json(), terser()]
}));
