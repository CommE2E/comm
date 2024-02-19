// @flow

import type { OlmAPI } from 'lib/types/crypto-types';

import { commCoreModule } from '../native-modules.js';

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    await commCoreModule.initializeCryptoAccount();
  },
  async encrypt(content: string, deviceID: string): Promise<string> {
    return await commCoreModule.encrypt(content, deviceID);
  },
  async decrypt(encryptedContent: string, deviceID: string): Promise<string> {
    return await commCoreModule.decrypt(encryptedContent, deviceID);
  },
};

export { olmAPI };
