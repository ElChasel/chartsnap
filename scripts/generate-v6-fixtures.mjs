import {mkdir,writeFile} from 'node:fs/promises';
import Papa from 'papaparse';
import {fixtures} from '../tests/fixtures-v6.js';
await mkdir('artifacts/v6-fixtures',{recursive:true});
for(const [name,rows]of Object.entries(fixtures()))await writeFile(`artifacts/v6-fixtures/${name}.csv`,Papa.unparse(rows));
console.log('Generated 8 deterministic CSV fixtures (seed 611).');
