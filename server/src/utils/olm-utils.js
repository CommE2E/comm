// @flow

import olmConfig from '../../secrets/olm_config';

type OlmConfig = {
  +privateKey: string,
};

function getOlmConfig(): OlmConfig {
  return olmConfig;
}

export { getOlmConfig };
