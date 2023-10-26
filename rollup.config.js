import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension';

export default defineConfig({
    input: 'src/manifest.json',
    output: [
        {
            dir: 'dist/',
            format: 'esm',
            sourcemap: true
        }
    ],
    plugins: [
        chromeExtension(),
        simpleReloader(),
        typescript({
            tsconfig: './tsconfig.json'
            // transpiler: 'swc'
        }),
        terser()
    ]
});
