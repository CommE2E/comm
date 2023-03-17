// @flow

import olm from '@commapp/olm';
import type { Utility as OlmUtility } from '@commapp/olm';
import invariant from 'invariant';

import { importJSON } from './import-json.js';

type OlmConfig = {
  +picklingKey: string,
  +pickledAccount: string,
};

async function getOlmConfig(): Promise<OlmConfig> {
  const olmConfig = await importJSON({ folder: 'secrets', name: 'olm_config' });
  invariant(olmConfig, 'OLM config missing');
  return olmConfig;
}

let cachedOLMUtility: OlmUtility;
function getOlmUtility(): OlmUtility {
  if (cachedOLMUtility) {
    return cachedOLMUtility;
  }
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

export { getOlmConfig, getOlmUtility };
