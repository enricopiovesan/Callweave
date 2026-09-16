import fs from 'node:fs';

const path = new URL('../traverse/schemas/model-execution-envelope.schema.json', import.meta.url);
const schema = JSON.parse(fs.readFileSync(path, 'utf8'));
const requiredDefs = ['manifest', 'request', 'response', 'modelRef', 'limits', 'digest'];
if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') throw new Error('wrong schema draft');
for (const name of requiredDefs) if (!schema.$defs?.[name]) throw new Error(`missing $defs.${name}`);
if (!schema.$defs.manifest.required.includes('digest')) throw new Error('manifest digest must be required');
if (!schema.$defs.request.required.includes('payload_bytes')) throw new Error('request payload must be required');
console.log(`model_execution_schema=passed defs=${requiredDefs.length}`);
