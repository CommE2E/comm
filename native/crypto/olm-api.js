// @flow

import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import { type AuthMetadata } from 'lib/shared/identity-client-context.js';
import {
  type OneTimeKeysResultValues,
  type OlmAPI,
  type OLMIdentityKeys,
  type EncryptedData,
  olmEncryptedMessageTypes,
} from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';

import { commCoreModule } from '../native-modules.js';

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    await commCoreModule.initializeCryptoAccount();
  },
  getUserPublicKey: commCoreModule.getUserPublicKey,
  encrypt: commCoreModule.encrypt,
  decrypt: commCoreModule.decrypt,
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedData: EncryptedData,
  ): Promise<string> {
    const identityKeys = JSON.stringify({
      curve25519: contentIdentityKeys.curve25519,
      ed25519: contentIdentityKeys.ed25519,
    });
    return commCoreModule.initializeContentInboundSession(
      identityKeys,
      initialEncryptedData.message,
      contentIdentityKeys.ed25519,
    );
  },
  async contentOutboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    contentInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<EncryptedData> {
    const { prekey, prekeySignature, oneTimeKey } = contentInitializationInfo;
    const identityKeys = JSON.stringify({
      curve25519: contentIdentityKeys.curve25519,
      ed25519: contentIdentityKeys.ed25519,
    });

    const message = await commCoreModule.initializeContentOutboundSession(
      identityKeys,
      prekey,
      prekeySignature,
      oneTimeKey,
      contentIdentityKeys.ed25519,
    );
    return {
      message,
      messageType: olmEncryptedMessageTypes.PREKEY,
    };
  },
  notificationsSessionCreator(
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ): Promise<string> {
    const { prekey, prekeySignature, oneTimeKey } =
      notificationsInitializationInfo;
    return commCoreModule.initializeNotificationsSession(
      JSON.stringify(notificationsIdentityKeys),
      prekey,
      prekeySignature,
      oneTimeKey,
      keyserverID,
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
  async validateAndUploadPrekeys(authMetadata: AuthMetadata): Promise<void> {
    const { userID, deviceID, accessToken } = authMetadata;
    if (!userID || !deviceID || !accessToken) {
      return;
    }
    await commCoreModule.validateAndUploadPrekeys(
      userID,
      deviceID,
      accessToken,
    );
  },
  signMessage: commCoreModule.signMessage,
};

export { olmAPI };
