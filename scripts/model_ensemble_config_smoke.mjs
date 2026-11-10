import assert from 'node:assert/strict';
import { loadEnsembleConfig, routeConfiguredModels } from '../src/model-ensemble-config.mjs';

const config = await loadEnsembleConfig();
assert.equal(config.models.length, 5);
assert.deepEqual(routeConfiguredModels(config, 'mammal').map(model => model.model_id), ['audio.yamnet.event-gate']);
assert.deepEqual(routeConfiguredModels(config, 'bird').map(model => model.model_id), ['audio.yamnet.event-gate']);
assert.equal(config.models.find(model => model.model_id === 'birdnet').enabled, false);
console.log('model_ensemble_config=passed exact_enabled=1 restricted_disabled=1');
