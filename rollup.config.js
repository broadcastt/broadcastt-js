import typescript from '@rollup/plugin-typescript';
import babel from 'rollup-plugin-babel';
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";

module.exports = {
  input: './src/broadcastt.ts',
  output: {
    format: 'umd',
    name: 'Broadcastt',
    file: './dist/web/broadcastt.js',
  },
  plugins: [
    // Include external modules in bundle
    resolve(),
    // Read values from json (eg. package.json)
    json(),
    typescript(),
    babel({
      exclude: 'node_modules/**',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
  ],
}
