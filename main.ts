import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking');
const { run } = await import(new URL('./solve.js', import.meta.url).href);

const source = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const target = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(join(source, 'cases.json'), 'utf8'));
const answers = [];
for (const item of cases) answers.push(run(item.input));
writeFileSync(join(target, 'answers.json'), JSON.stringify(answers));
