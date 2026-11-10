import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const pkg = JSON.parse(await readFile(new URL('../node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf8'));
const directory = new URL('../public/mediapipe/', import.meta.url);
const destination = new URL(`wasm-${pkg.version}/`, directory);
const modelFile = new URL('hand_landmarker-v1.task', directory);
const expectedHash = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

await mkdir(destination, { recursive: true });
await cp(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url), destination, { recursive: true });
let model;
try { model = await readFile(modelFile); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!model || digest(model) !== expectedHash) {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
  if (!response.ok) throw new Error(`MediaPipe model download failed: ${response.status}`);
  model = Buffer.from(await response.arrayBuffer());
  if (digest(model) !== expectedHash) throw new Error('MediaPipe model checksum mismatch');
  await writeFile(modelFile, model);
}
