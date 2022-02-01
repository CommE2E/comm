// @flow

import fs from 'fs';
import path from 'path';

import olmConfig from '../../secrets/olm_config';
type OlmConfig = {
  +privateKey: string,
  +publicKey: string,
};

function getOlmConfig(): OlmConfig {
  return olmConfig;
}

function persistOlmConfig(config: OlmConfig, olmConfigPath: string): void {
  if (path.extname(olmConfigPath) !== '.json') {
    throw TypeError('Olm configuration must be stored in JSON file.');
  }
  fs.writeFileSync(olmConfigPath, JSON.stringify(config), {
    flag: 'w+',
  });
}

export { getOlmConfig, persistOlmConfig };
