import { readFile } from 'node:fs/promises';
import { routeModelFamilies } from './model-ensemble.mjs';

function required(value, path) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

export function validateEnsembleConfig(config) {
  if (!config || config.schema_version !== '1.0.0' || !Array.isArray(config.models)) throw new Error('invalid model ensemble config');
  const ids = new Set();
  for (const model of config.models) {
    const id = required(model.model_id, 'model_id');
    if (ids.has(id)) throw new Error(`duplicate model: ${id}`);
    ids.add(id);
    if (!Array.isArray(model.families) || model.families.length === 0) throw new Error(`${id} must declare families`);
    if (model.enabled && (!model.version || !model.digest)) throw new Error(`${id} cannot be enabled without an exact version and digest`);
  }
  return Object.freeze(config);
}

export async function loadEnsembleConfig(url = new URL('../config/model-ensemble.json', import.meta.url)) {
  return validateEnsembleConfig(JSON.parse(await readFile(url, 'utf8')));
}

export function routeConfiguredModels(config, eventFamily) {
  return routeModelFamilies({ event_family: eventFamily, models: config.models });
}
