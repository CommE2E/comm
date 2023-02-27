// @flow

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

export { getOlmConfig };
