// @flow

import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import { type AuthMetadata } from 'lib/shared/identity-client-context.js';
import {
  type OneTimeKeysResultValues,
  type OlmAPI,
  type OLMIdentityKeys,
  type EncryptedData,
  type OutboundSessionCreationResult,
} from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { commCoreModule } from '../native-modules.js';

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    await commCoreModule.initializeCryptoAccount();
  },
  getUserPublicKey: commCoreModule.getUserPublicKey,
  encrypt: commCoreModule.encrypt,
  encryptAndPersist: commCoreModule.encryptAndPersist,
  decrypt: commCoreModule.decrypt,
  decryptSequentialAndPersist: commCoreModule.decryptSequentialAndPersist,
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedData: EncryptedData,
    sessionVersion: number,
    overwrite: boolean,
  ): Promise<string> {
    const identityKeys = JSON.stringify({
      curve25519: contentIdentityKeys.curve25519,
      ed25519: contentIdentityKeys.ed25519,
    });
    return commCoreModule.initializeContentInboundSession(
      identityKeys,
      initialEncryptedData,
      contentIdentityKeys.ed25519,
      sessionVersion,
      overwrite,
    );
  },
  isContentSessionInitialized: commCoreModule.isContentSessionInitialized,
  async contentOutboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    contentInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<OutboundSessionCreationResult> {
    const { prekey, prekeySignature, oneTimeKey } = contentInitializationInfo;
    const identityKeys = JSON.stringify({
      curve25519: contentIdentityKeys.curve25519,
      ed25519: contentIdentityKeys.ed25519,
    });

    return commCoreModule.initializeContentOutboundSession(
      identityKeys,
      prekey,
      prekeySignature,
      oneTimeKey,
      contentIdentityKeys.ed25519,
    );
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
  async notificationsOutboundSessionCreator(
    notificationsIdentityKeys: OLMIdentityKeys,
    contentIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<EncryptedData> {
    const { prekey, prekeySignature, oneTimeKey } =
      notificationsInitializationInfo;
    const identityKeys = JSON.stringify({
      curve25519: notificationsIdentityKeys.curve25519,
      ed25519: notificationsIdentityKeys.ed25519,
    });
    return commCoreModule.initializeNotificationsOutboundSession(
      identityKeys,
      prekey,
      prekeySignature,
      oneTimeKey,
      contentIdentityKeys.ed25519,
    );
  },
  isPeerNotificationsSessionInitialized:
    commCoreModule.isPeerNotificationsSessionInitialized,
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
  async verifyMessage(
    message: string,
    signature: string,
    signingPublicKey: string,
  ): Promise<boolean> {
    try {
      await commCoreModule.verifySignature(
        signingPublicKey,
        message,
        signature,
      );
      return true;
    } catch (err) {
      const isSignatureInvalid =
        getMessageForException(err)?.includes('BAD_MESSAGE_MAC');
      if (isSignatureInvalid) {
        return false;
      }
      throw err;
    }
  },
  markPrekeysAsPublished: commCoreModule.markPrekeysAsPublished,
};

export { olmAPI };
