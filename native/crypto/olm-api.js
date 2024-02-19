// @flow

import type { OlmAPI } from 'lib/types/crypto-types';

import { commCoreModule } from '../native-modules.js';

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    await commCoreModule.initializeCryptoAccount();
  },
  encrypt: commCoreModule.encrypt,
  decrypt: commCoreModule.decrypt,
};

export { olmAPI };
