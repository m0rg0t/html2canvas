import ts from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
    {ignores: ['dist/**', 'build/**', 'www/**', 'node_modules/**']},
    {
        files: ['src/**/*.ts'],
        languageOptions: {parser, parserOptions: {project: './tsconfig.json'}},
        // ESLint 7 did not report unused suppression directives by default.
        linterOptions: {reportUnusedDisableDirectives: 'off'},
        plugins: {'@typescript-eslint': ts, prettier: prettierPlugin},
        rules: {
            ...ts.configs['eslint-recommended'].overrides[0].rules,
            ...ts.configs.recommended.rules,
            ...prettier.rules,
            'no-console': ['error', {allow: ['warn', 'error']}],
            '@typescript-eslint/explicit-member-accessibility': ['error', {accessibility: 'no-public'}],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'prettier/prettier': 'error'
        }
    }
];
