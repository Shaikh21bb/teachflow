import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
    { ignores: ['node_modules/**', 'server/node_modules/**', 'dist/**'] },
    {
        files: ['**/*.{js,jsx,cjs}'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { react },
        settings: { react: { version: '18.2' } },
        rules: { 'no-undef': js.configs.recommended.rules['no-undef'], 'no-dupe-keys': 'error', 'react/jsx-no-undef': 'error' },
    },
];
