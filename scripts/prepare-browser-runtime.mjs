import {copyFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const out=resolve('public/assets/runtime');await mkdir(out,{recursive:true});
const mj=dirname(require.resolve('@mujoco/mujoco')),ort=dirname(require.resolve('onnxruntime-web'));
for(const [from,name]of [[resolve(mj,'mujoco.js'),'mujoco.js'],[resolve(mj,'mujoco.wasm'),'mujoco.wasm'],[resolve(ort,'ort-wasm-simd-threaded.mjs'),'ort-wasm-simd-threaded.mjs'],[resolve(ort,'ort-wasm-simd-threaded.wasm'),'ort-wasm-simd-threaded.wasm']])await copyFile(from,resolve(out,name));
console.log('Prepared local physics and ONNX runtime.');
