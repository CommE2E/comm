// @flow

import olm from '@commapp/olm';
import localforage from 'localforage';
import uuid from 'uuid';

import { initialEncryptedMessageContent } from 'lib/shared/crypto-utils.js';
import {
  hasMinCodeVersion,
  NEXT_CODE_VERSION,
} from 'lib/shared/version-utils.js';
import {
  olmEncryptedMessageTypes,
  type OLMIdentityKeys,
  type PickledOLMAccount,
  type IdentityKeysBlob,
  type SignedIdentityKeysBlob,
  type OlmAPI,
  type OneTimeKeysResultValues,
  type ClientPublicKeys,
  type NotificationsOlmDataType,
} from 'lib/types/crypto-types.js';
import type {
  IdentityNewDeviceKeyUpload,
  IdentityExistingDeviceKeyUpload,
} from 'lib/types/identity-service-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import { entries } from 'lib/utils/objects.js';
import {
  retrieveAccountKeysSet,
  getAccountOneTimeKeys,
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
  retrieveIdentityKeysAndPrekeys,
} from 'lib/utils/olm-utils.js';

import { getIdentityClient } from './identity-client.js';
import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import {
  getDBModule,
  getSQLiteQueryExecutor,
  getPlatformDetails,
} from './worker-database.js';
import {
  encryptData,
  exportKeyToJWK,
  generateCryptoKey,
} from '../../crypto/aes-gcm-crypto-utils.js';
import {
  getOlmDataContentKeyForCookie,
  getOlmEncryptionKeyDBLabelForCookie,
} from '../../push-notif/notif-crypto-utils.js';
import {
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type LegacyCryptoStore,
} from '../../types/worker-types.js';
import type { OlmPersistSession } from '../types/sqlite-query-executor.js';
import { isDesktopSafari } from '../utils/db-utils.js';

type WorkerCryptoStore = {
  +contentAccountPickleKey: string,
  +contentAccount: olm.Account,
  +contentSessions: { [deviceID: string]: olm.Session },
  +notificationAccountPickleKey: string,
  +notificationAccount: olm.Account,
};

let cryptoStore: ?WorkerCryptoStore = null;

function clearCryptoStore() {
  cryptoStore = null;
}

function persistCryptoStore() {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      "Couldn't persist crypto store because database is not initialized",
    );
  }
  if (!cryptoStore) {
    throw new Error("Couldn't persist crypto store because it doesn't exist");
  }

  const {
    contentAccountPickleKey,
    contentAccount,
    contentSessions,
    notificationAccountPickleKey,
    notificationAccount,
  } = cryptoStore;

  const pickledContentAccount: PickledOLMAccount = {
    picklingKey: contentAccountPickleKey,
    pickledAccount: contentAccount.pickle(contentAccountPickleKey),
  };

  const pickledContentSessions: OlmPersistSession[] = entries(
    contentSessions,
  ).map(([deviceID, session]) => ({
    targetUserID: deviceID,
    sessionData: session.pickle(contentAccountPickleKey),
  }));

  const pickledNotificationAccount: PickledOLMAccount = {
    picklingKey: notificationAccountPickleKey,
    pickledAccount: notificationAccount.pickle(notificationAccountPickleKey),
  };

  try {
    sqliteQueryExecutor.storeOlmPersistAccount(
      sqliteQueryExecutor.getContentAccountID(),
      JSON.stringify(pickledContentAccount),
    );
    for (const pickledSession of pickledContentSessions) {
      sqliteQueryExecutor.storeOlmPersistSession(pickledSession);
    }
    sqliteQueryExecutor.storeOlmPersistAccount(
      sqliteQueryExecutor.getNotifsAccountID(),
      JSON.stringify(pickledNotificationAccount),
    );
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }
}

function getOrCreateOlmAccount(accountIDInDB: number): {
  +picklingKey: string,
  +account: olm.Account,
} {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error('Database not initialized');
  }

  const account = new olm.Account();
  let picklingKey;

  let accountDBString;
  try {
    accountDBString =
      sqliteQueryExecutor.getOlmPersistAccountDataWeb(accountIDInDB);
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  if (accountDBString.isNull) {
    picklingKey = uuid.v4();
    account.create();
  } else {
    const dbAccount: PickledOLMAccount = JSON.parse(accountDBString.value);
    picklingKey = dbAccount.picklingKey;
    account.unpickle(picklingKey, dbAccount.pickledAccount);
  }

  return { picklingKey, account };
}

function getOlmSessions(picklingKey: string): {
  [deviceID: string]: olm.Session,
} {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      "Couldn't get olm sessions because database is not initialized",
    );
  }

  let sessionsData;
  try {
    sessionsData = sqliteQueryExecutor.getOlmPersistSessionsData();
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  const sessions: { [deviceID: string]: olm.Session } = {};
  for (const sessionData of sessionsData) {
    const session = new olm.Session();
    session.unpickle(picklingKey, sessionData.sessionData);
    sessions[sessionData.targetUserID] = session;
  }

  return sessions;
}

function unpickleInitialCryptoStoreAccount(
  account: PickledOLMAccount,
): olm.Account {
  const { picklingKey, pickledAccount } = account;
  const olmAccount = new olm.Account();
  olmAccount.unpickle(picklingKey, pickledAccount);
  return olmAccount;
}

async function initializeCryptoAccount(
  olmWasmPath: string,
  initialCryptoStore: ?LegacyCryptoStore,
) {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  if (!sqliteQueryExecutor) {
    throw new Error('Database not initialized');
  }

  await olm.init({ locateFile: () => olmWasmPath });

  if (initialCryptoStore) {
    cryptoStore = {
      contentAccountPickleKey: initialCryptoStore.primaryAccount.picklingKey,
      contentAccount: unpickleInitialCryptoStoreAccount(
        initialCryptoStore.primaryAccount,
      ),
      contentSessions: {},
      notificationAccountPickleKey:
        initialCryptoStore.notificationAccount.picklingKey,
      notificationAccount: unpickleInitialCryptoStoreAccount(
        initialCryptoStore.notificationAccount,
      ),
    };
    persistCryptoStore();
    return;
  }

  await olmAPI.initializeCryptoAccount();
}

async function processAppOlmApiRequest(
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (message.type === workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT) {
    await initializeCryptoAccount(
      message.olmWasmPath,
      message.initialCryptoStore,
    );
  } else if (message.type === workerRequestMessageTypes.CALL_OLM_API_METHOD) {
    const method: (...$ReadOnlyArray<mixed>) => mixed = (olmAPI[
      message.method
    ]: any);
    // Flow doesn't allow us to bind the (stringified) method name with
    // the argument types so we need to pass the args as mixed.
    const result = await method(...message.args);
    return {
      type: workerResponseMessageTypes.CALL_OLM_API_METHOD,
      result,
    };
  }
  return undefined;
}

function getSignedIdentityKeysBlob(): SignedIdentityKeysBlob {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const { contentAccount, notificationAccount } = cryptoStore;

  const identityKeysBlob: IdentityKeysBlob = {
    notificationIdentityPublicKeys: JSON.parse(
      notificationAccount.identity_keys(),
    ),
    primaryIdentityPublicKeys: JSON.parse(contentAccount.identity_keys()),
  };

  const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: payloadToBeSigned,
    signature: contentAccount.sign(payloadToBeSigned),
  };

  return signedIdentityKeysBlob;
}

function getNewDeviceKeyUpload(): IdentityNewDeviceKeyUpload {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }
  const { contentAccount, notificationAccount } = cryptoStore;

  const signedIdentityKeysBlob = getSignedIdentityKeysBlob();

  const primaryAccountKeysSet = retrieveAccountKeysSet(contentAccount);
  const notificationAccountKeysSet =
    retrieveAccountKeysSet(notificationAccount);

  persistCryptoStore();

  return {
    keyPayload: signedIdentityKeysBlob.payload,
    keyPayloadSignature: signedIdentityKeysBlob.signature,
    contentPrekey: primaryAccountKeysSet.prekey,
    contentPrekeySignature: primaryAccountKeysSet.prekeySignature,
    notifPrekey: notificationAccountKeysSet.prekey,
    notifPrekeySignature: notificationAccountKeysSet.prekeySignature,
    contentOneTimeKeys: primaryAccountKeysSet.oneTimeKeys,
    notifOneTimeKeys: notificationAccountKeysSet.oneTimeKeys,
  };
}

function getExistingDeviceKeyUpload(): IdentityExistingDeviceKeyUpload {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }
  const { contentAccount, notificationAccount } = cryptoStore;

  const signedIdentityKeysBlob = getSignedIdentityKeysBlob();

  const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
    retrieveIdentityKeysAndPrekeys(contentAccount);
  const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
    retrieveIdentityKeysAndPrekeys(notificationAccount);

  persistCryptoStore();

  return {
    keyPayload: signedIdentityKeysBlob.payload,
    keyPayloadSignature: signedIdentityKeysBlob.signature,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
  };
}

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    const sqliteQueryExecutor = getSQLiteQueryExecutor();
    if (!sqliteQueryExecutor) {
      throw new Error('Database not initialized');
    }

    const contentAccountResult = getOrCreateOlmAccount(
      sqliteQueryExecutor.getContentAccountID(),
    );
    const notificationAccountResult = getOrCreateOlmAccount(
      sqliteQueryExecutor.getNotifsAccountID(),
    );
    const contentSessions = getOlmSessions(contentAccountResult.picklingKey);

    cryptoStore = {
      contentAccountPickleKey: contentAccountResult.picklingKey,
      contentAccount: contentAccountResult.account,
      contentSessions,
      notificationAccountPickleKey: notificationAccountResult.picklingKey,
      notificationAccount: notificationAccountResult.account,
    };

    persistCryptoStore();
  },
  async getUserPublicKey(): Promise<ClientPublicKeys> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, notificationAccount } = cryptoStore;
    const { payload, signature } = getSignedIdentityKeysBlob();

    return {
      primaryIdentityPublicKeys: JSON.parse(contentAccount.identity_keys()),
      notificationIdentityPublicKeys: JSON.parse(
        notificationAccount.identity_keys(),
      ),
      blobPayload: payload,
      signature,
    };
  },
  async encrypt(content: string, deviceID: string): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const session = cryptoStore.contentSessions[deviceID];
    if (!session) {
      throw new Error(`No session for deviceID: ${deviceID}`);
    }
    const { body } = session.encrypt(content);

    persistCryptoStore();

    return body;
  },
  async decrypt(encryptedContent: string, deviceID: string): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const session = cryptoStore.contentSessions[deviceID];
    if (!session) {
      throw new Error(`No session for deviceID: ${deviceID}`);
    }

    const result = session.decrypt(
      olmEncryptedMessageTypes.TEXT,
      encryptedContent,
    );

    persistCryptoStore();

    return result;
  },
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedContent: string,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, contentSessions } = cryptoStore;

    const session = new olm.Session();
    session.create_inbound_from(
      contentAccount,
      contentIdentityKeys.curve25519,
      initialEncryptedContent,
    );

    contentAccount.remove_one_time_keys(session);
    const initialEncryptedMessage = session.decrypt(
      olmEncryptedMessageTypes.PREKEY,
      initialEncryptedContent,
    );

    contentSessions[contentIdentityKeys.ed25519] = session;
    persistCryptoStore();

    return initialEncryptedMessage;
  },
  async contentOutboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    contentInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, contentSessions } = cryptoStore;

    const session = new olm.Session();
    session.create_outbound(
      contentAccount,
      contentIdentityKeys.curve25519,
      contentIdentityKeys.ed25519,
      contentInitializationInfo.prekey,
      contentInitializationInfo.prekeySignature,
      contentInitializationInfo.oneTimeKey,
    );
    const { body: initialContentEncryptedMessage } = session.encrypt(
      JSON.stringify(initialEncryptedMessageContent),
    );

    contentSessions[contentIdentityKeys.ed25519] = session;
    persistCryptoStore();

    return initialContentEncryptedMessage;
  },
  async notificationsSessionCreator(
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ): Promise<string> {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error('Worker not initialized');
    }

    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const { notificationAccountPickleKey, notificationAccount } = cryptoStore;
    const encryptionKey = await generateCryptoKey({
      extractable: isDesktopSafari,
    });

    const notificationsPrekey = notificationsInitializationInfo.prekey;
    const session = new olm.Session();
    session.create_outbound(
      notificationAccount,
      notificationsIdentityKeys.curve25519,
      notificationsIdentityKeys.ed25519,
      notificationsPrekey,
      notificationsInitializationInfo.prekeySignature,
      notificationsInitializationInfo.oneTimeKey,
    );
    const { body: initialNotificationsEncryptedMessage } = session.encrypt(
      JSON.stringify(initialEncryptedMessageContent),
    );

    const mainSession = session.pickle(notificationAccountPickleKey);
    const notificationsOlmData: NotificationsOlmDataType = {
      mainSession,
      pendingSessionUpdate: mainSession,
      updateCreationTimestamp: Date.now(),
      picklingKey: notificationAccountPickleKey,
    };
    const encryptedOlmData = await encryptData(
      new TextEncoder().encode(JSON.stringify(notificationsOlmData)),
      encryptionKey,
    );

    let notifsOlmDataContentKey;
    let notifsOlmDataEncryptionKeyDBLabel;

    if (
      hasMinCodeVersion(platformDetails, { majorDesktop: NEXT_CODE_VERSION })
    ) {
      notifsOlmDataEncryptionKeyDBLabel = getOlmEncryptionKeyDBLabelForCookie(
        cookie,
        keyserverID,
      );
      notifsOlmDataContentKey = getOlmDataContentKeyForCookie(
        cookie,
        keyserverID,
      );
    } else {
      notifsOlmDataEncryptionKeyDBLabel =
        getOlmEncryptionKeyDBLabelForCookie(cookie);
      notifsOlmDataContentKey = getOlmDataContentKeyForCookie(cookie);
    }

    const persistEncryptionKeyPromise = (async () => {
      let cryptoKeyPersistentForm;
      if (isDesktopSafari) {
        // Safari doesn't support structured clone algorithm in service
        // worker context so we have to store CryptoKey as JSON
        cryptoKeyPersistentForm = await exportKeyToJWK(encryptionKey);
      } else {
        cryptoKeyPersistentForm = encryptionKey;
      }

      await localforage.setItem(
        notifsOlmDataEncryptionKeyDBLabel,
        cryptoKeyPersistentForm,
      );
    })();

    await Promise.all([
      localforage.setItem(notifsOlmDataContentKey, encryptedOlmData),
      persistEncryptionKeyPromise,
    ]);

    return initialNotificationsEncryptedMessage;
  },
  async getOneTimeKeys(numberOfKeys: number): Promise<OneTimeKeysResultValues> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, notificationAccount } = cryptoStore;

    const contentOneTimeKeys = getAccountOneTimeKeys(
      contentAccount,
      numberOfKeys,
    );
    contentAccount.mark_keys_as_published();

    const notificationsOneTimeKeys = getAccountOneTimeKeys(
      notificationAccount,
      numberOfKeys,
    );
    notificationAccount.mark_keys_as_published();

    persistCryptoStore();

    return { contentOneTimeKeys, notificationsOneTimeKeys };
  },
  async validateAndUploadPrekeys(authMetadata): Promise<void> {
    const { userID, deviceID, accessToken } = authMetadata;
    if (!userID || !deviceID || !accessToken) {
      return;
    }
    const identityClient = getIdentityClient();

    if (!identityClient) {
      throw new Error('Identity client not initialized');
    }

    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, notificationAccount } = cryptoStore;

    // Content and notification accounts' keys are always rotated at the same
    // time so we only need to check one of them.
    if (shouldRotatePrekey(contentAccount)) {
      contentAccount.generate_prekey();
      notificationAccount.generate_prekey();
    }
    if (shouldForgetPrekey(contentAccount)) {
      contentAccount.forget_old_prekey();
      notificationAccount.forget_old_prekey();
    }
    persistCryptoStore();

    if (!contentAccount.unpublished_prekey()) {
      return;
    }

    const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
      getAccountPrekeysSet(notificationAccount);
    const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
      getAccountPrekeysSet(contentAccount);

    if (!notifPrekeySignature || !contentPrekeySignature) {
      throw new Error('Prekey signature is missing');
    }

    await identityClient.publishWebPrekeys({
      contentPrekey,
      contentPrekeySignature,
      notifPrekey,
      notifPrekeySignature,
    });
    contentAccount.mark_prekey_as_published();
    notificationAccount.mark_prekey_as_published();

    persistCryptoStore();
  },
  async signMessage(message: string): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    return contentAccount.sign(message);
  },
};

export {
  clearCryptoStore,
  processAppOlmApiRequest,
  getSignedIdentityKeysBlob,
  getNewDeviceKeyUpload,
  getExistingDeviceKeyUpload,
};
