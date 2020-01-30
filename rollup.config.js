import typescript from 'rollup-plugin-typescript2';
import Typescript from 'typescript';
import pkg from './package.json';

export default [
  {
    input: 'src/index.ts',
    external: [],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [
      typescript({
        typescript: Typescript,
      }),
    ],
  },
];
