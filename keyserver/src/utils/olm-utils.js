// @flow

import olm from '@matrix-org/olm';
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

export type OLMUtility = {
  +free: () => void,
  +sha256: (input: string | Uint8Array) => string,
  +ed25519_verify: (
    key: string,
    message: string | Uint8Array,
    signature: string,
  ) => void,
};

let cachedOLMUtility: OLMUtility;
function getOLMUtility(): OLMUtility {
  if (cachedOLMUtility) {
    return cachedOLMUtility;
  }
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

export { getOlmConfig, getOLMUtility };
