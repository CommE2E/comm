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

export { getOlmConfig };
