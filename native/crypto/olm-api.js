// @flow

import type { OlmAPI, OLMIdentityKeys } from 'lib/types/crypto-types';

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
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedContent: string,
  ): Promise<string> {
    const identityKeys = JSON.stringify({
      curve25519: contentIdentityKeys.curve25519,
      ed25519: contentIdentityKeys.ed25519,
    });
    return commCoreModule.initializeContentInboundSession(
      identityKeys,
      initialEncryptedContent,
      contentIdentityKeys.ed25519,
    );
  },
};

export { olmAPI };
