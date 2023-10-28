import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
    plugins: [solid(), crx({ manifest })]
});
