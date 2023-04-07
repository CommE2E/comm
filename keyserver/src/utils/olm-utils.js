// @flow

import olm from '@matrix-org/olm';
import type { Utility as OlmUtility } from '@matrix-org/olm';
import invariant from 'invariant';

import { getCommConfig } from 'lib/utils/comm-config.js';

type OlmConfig = {
  +picklingKey: string,
  +pickledAccount: string,
};

async function getOlmConfig(): Promise<OlmConfig> {
  const olmConfig = await getCommConfig({
    folder: 'secrets',
    name: 'olm_config',
  });
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
