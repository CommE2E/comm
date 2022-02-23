// @flow

import olmConfig from '../../secrets/olm_config';

type OlmConfig = {
  +picklingKey: string,
  +pickledAccount: string,
};

function getOlmConfig(): OlmConfig {
  return olmConfig;
}

export { getOlmConfig };
