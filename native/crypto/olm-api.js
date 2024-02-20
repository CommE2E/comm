// @flow

import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import type {
  OneTimeKeysResultValues,
  OlmAPI,
  OLMIdentityKeys,
} from 'lib/types/crypto-types';

import { commCoreModule } from '../native-modules.js';

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    await commCoreModule.initializeCryptoAccount();
  },
  encrypt: commCoreModule.encrypt,
  decrypt: commCoreModule.decrypt,
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
  async getOneTimeKeys(numberOfKeys: number): Promise<OneTimeKeysResultValues> {
    const { contentOneTimeKeys, notificationsOneTimeKeys } =
      await commCoreModule.getOneTimeKeys(numberOfKeys);
    return {
      contentOneTimeKeys: getOneTimeKeyValues(contentOneTimeKeys),
      notificationsOneTimeKeys: getOneTimeKeyValues(notificationsOneTimeKeys),
    };
  },
};

export { olmAPI };
