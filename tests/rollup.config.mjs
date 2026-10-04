import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import {resolve} from 'path';

const pkg = require('../package.json');

const banner = `/*
 * ${pkg.title} ${pkg.version} <${pkg.homepage}>
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author.name} <${pkg.author.url}>
 * Released under ${pkg.license} License
 */`;

export default {
    input: `tests/testrunner.ts`,
    output: [
        {
            dir: resolve(__dirname, '../build'),
            entryFileNames: 'testrunner.js',
            name: 'testrunner',
            format: 'iife',
            banner,
            sourcemap: true
        }
    ],
    external: [],
    watch: {
        include: 'tests/**'
    },
    plugins: [
        // Allow node_modules resolution, so you can use 'external' to control
        // which external modules to include in the bundle
        // https://github.com/rollup/rollup-plugin-node-resolve#usage
        nodeResolve(),
        // Allow json resolution
        json(),
        // Compile TypeScript files
        typescript({
            tsconfig: resolve(__dirname, 'tsconfig.json'),
            outDir: resolve(__dirname, '../build/typescript'),
            declaration: false,
            declarationDir: undefined
        }),
        // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
        commonjs({
            include: 'node_modules/**'
        }),

    ]
};
