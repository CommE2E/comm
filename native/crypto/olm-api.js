// @flow

import { type AuthMetadata } from 'lib/shared/identity-client-context.js';
import {
  type OneTimeKeysResultValues,
  type OlmAPI,
  type OLMIdentityKeys,
  type EncryptedData,
  type OutboundSessionCreationResult,
} from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/olm-session-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { commCoreModule } from '../native-modules.js';

let currentInitializeCryptoAccountPromise: ?Promise<void>;
function initializeCryptoAccount(): Promise<void> {
  if (currentInitializeCryptoAccountPromise) {
    return currentInitializeCryptoAccountPromise;
  }
  currentInitializeCryptoAccountPromise = (async () => {
    try {
      await commCoreModule.initializeCryptoAccount();
    } finally {
      currentInitializeCryptoAccountPromise = null;
    }
  })();
  return currentInitializeCryptoAccountPromise;
}

const olmAPI: OlmAPI = {
  initializeCryptoAccount,
  getUserPublicKey: commCoreModule.getUserPublicKey,
  encrypt: commCoreModule.encrypt,
  encryptAndPersist: commCoreModule.encryptAndPersist,
  encryptNotification: commCoreModule.encryptNotification,
  decrypt: commCoreModule.decrypt,
  decryptAndPersist: commCoreModule.decryptAndPersist,
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
    olmCompatibilityMode: boolean,
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
      olmCompatibilityMode,
    );
  },
  keyserverNotificationsSessionCreator(
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
    olmCompatibilityMode: boolean,
  ): Promise<string> {
    const { prekey, prekeySignature, oneTimeKey } =
      notificationsInitializationInfo;
    return commCoreModule.initializeNotificationsSession(
      JSON.stringify(notificationsIdentityKeys),
      prekey,
      prekeySignature,
      oneTimeKey,
      keyserverID,
      olmCompatibilityMode,
    );
  },
  async notificationsOutboundSessionCreator(
    deviceID: string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    olmCompatibilityMode: boolean,
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
      deviceID,
      olmCompatibilityMode,
    );
  },
  isDeviceNotificationsSessionInitialized:
    commCoreModule.isDeviceNotificationsSessionInitialized,
  isNotificationsSessionInitializedWithDevices:
    commCoreModule.isNotificationsSessionInitializedWithDevices,
  async getOneTimeKeys(numberOfKeys: number): Promise<OneTimeKeysResultValues> {
    const { contentOneTimeKeys, notificationsOneTimeKeys } =
      await commCoreModule.getOneTimeKeys(numberOfKeys);
    return {
      contentOneTimeKeys: contentOneTimeKeys,
      notificationsOneTimeKeys: notificationsOneTimeKeys,
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
