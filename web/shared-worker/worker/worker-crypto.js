// @flow

import olm, { type Utility } from '@commapp/olm';
import localforage from 'localforage';
import uuid from 'uuid';

import { initialEncryptedMessageContent } from 'lib/shared/crypto-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import {
  type OLMIdentityKeys,
  type PickledOLMAccount,
  type IdentityKeysBlob,
  type SignedIdentityKeysBlob,
  type OlmAPI,
  type OneTimeKeysResultValues,
  type ClientPublicKeys,
  type NotificationsOlmDataType,
  type EncryptedData,
  type OutboundSessionCreationResult,
} from 'lib/types/crypto-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import type {
  IdentityNewDeviceKeyUpload,
  IdentityExistingDeviceKeyUpload,
} from 'lib/types/identity-service-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import type { InboundP2PMessage } from 'lib/types/sqlite-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { entries } from 'lib/utils/objects.js';
import {
  retrieveAccountKeysSet,
  getAccountOneTimeKeys,
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
  retrieveIdentityKeysAndPrekeys,
  olmSessionErrors,
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
  getOlmDataContentKeyForDeviceID,
  getOlmEncryptionKeyDBLabelForDeviceID,
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

type OlmSession = { +session: olm.Session, +version: number };
type OlmSessions = {
  [deviceID: string]: OlmSession,
};

type WorkerCryptoStore = {
  +contentAccountPickleKey: string,
  +contentAccount: olm.Account,
  +contentSessions: OlmSessions,
  +notificationAccountPickleKey: string,
  +notificationAccount: olm.Account,
};

let cryptoStore: ?WorkerCryptoStore = null;
let olmUtility: ?Utility = null;

function clearCryptoStore() {
  cryptoStore = null;
}

function persistCryptoStore(withoutTransaction: boolean = false) {
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
  ).map(([targetDeviceID, sessionData]) => ({
    targetDeviceID,
    sessionData: sessionData.session.pickle(contentAccountPickleKey),
    version: sessionData.version,
  }));

  const pickledNotificationAccount: PickledOLMAccount = {
    picklingKey: notificationAccountPickleKey,
    pickledAccount: notificationAccount.pickle(notificationAccountPickleKey),
  };

  try {
    if (!withoutTransaction) {
      sqliteQueryExecutor.beginTransaction();
    }
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
    if (!withoutTransaction) {
      sqliteQueryExecutor.commitTransaction();
    }
  } catch (err) {
    if (!withoutTransaction) {
      sqliteQueryExecutor.rollbackTransaction();
    }
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }
}

async function createAndPersistNotificationsOutboundSession(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  dataPersistenceKey: string,
  dataEncryptionKeyDBLabel: string,
): Promise<EncryptedData> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const { notificationAccountPickleKey, notificationAccount } = cryptoStore;
  const encryptionKey = await generateCryptoKey({
    extractable: isDesktopSafari,
  });

  const notificationsPrekey = notificationsInitializationInfo.prekey;
  const session = new olm.Session();
  if (notificationsInitializationInfo.oneTimeKey) {
    session.create_outbound(
      notificationAccount,
      notificationsIdentityKeys.curve25519,
      notificationsIdentityKeys.ed25519,
      notificationsPrekey,
      notificationsInitializationInfo.prekeySignature,
      notificationsInitializationInfo.oneTimeKey,
    );
  } else {
    session.create_outbound_without_otk(
      notificationAccount,
      notificationsIdentityKeys.curve25519,
      notificationsIdentityKeys.ed25519,
      notificationsPrekey,
      notificationsInitializationInfo.prekeySignature,
    );
  }
  const { body: message, type: messageType } = session.encrypt(
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
      dataEncryptionKeyDBLabel,
      cryptoKeyPersistentForm,
    );
  })();

  await Promise.all([
    localforage.setItem(dataPersistenceKey, encryptedOlmData),
    persistEncryptionKeyPromise,
  ]);

  return { message, messageType };
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

function getOlmSessions(picklingKey: string): OlmSessions {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      "Couldn't get olm sessions because database is not initialized",
    );
  }

  let dbSessionsData;
  try {
    dbSessionsData = sqliteQueryExecutor.getOlmPersistSessionsData();
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  const sessionsData: OlmSessions = {};
  for (const persistedSession: OlmPersistSession of dbSessionsData) {
    const { sessionData, version } = persistedSession;
    const session = new olm.Session();
    session.unpickle(picklingKey, sessionData);
    sessionsData[persistedSession.targetDeviceID] = {
      session,
      version,
    };
  }

  return sessionsData;
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
  olmUtility = new olm.Utility();

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

  contentAccount.mark_keys_as_published();
  notificationAccount.mark_keys_as_published();

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

function getNotifsPersistenceKeys(
  cookie: ?string,
  keyserverID: string,
  platformDetails: PlatformDetails,
) {
  if (hasMinCodeVersion(platformDetails, { majorDesktop: 12 })) {
    return {
      notifsOlmDataEncryptionKeyDBLabel: getOlmEncryptionKeyDBLabelForCookie(
        cookie,
        keyserverID,
      ),
      notifsOlmDataContentKey: getOlmDataContentKeyForCookie(
        cookie,
        keyserverID,
      ),
    };
  } else {
    return {
      notifsOlmDataEncryptionKeyDBLabel:
        getOlmEncryptionKeyDBLabelForCookie(cookie),
      notifsOlmDataContentKey: getOlmDataContentKeyForCookie(cookie),
    };
  }
}

async function reassignLocalForageItem(source: string, destination: string) {
  const value = await localforage.getItem<mixed>(source);
  if (!value) {
    return;
  }
  const valueAtDestination = await localforage.getItem<mixed>(destination);
  if (!valueAtDestination) {
    await localforage.setItem(destination, value);
  }
  await localforage.removeItem(source);
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
  async encrypt(content: string, deviceID: string): Promise<EncryptedData> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(`No session for deviceID: ${deviceID}`);
    }
    const encryptedContent = olmSession.session.encrypt(content);

    persistCryptoStore();

    return {
      message: encryptedContent.body,
      messageType: encryptedContent.type,
    };
  },
  async encryptAndPersist(
    content: string,
    deviceID: string,
    messageID: string,
  ): Promise<EncryptedData> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(`No session for deviceID: ${deviceID}`);
    }

    const encryptedContent = olmSession.session.encrypt(content);

    const sqliteQueryExecutor = getSQLiteQueryExecutor();
    const dbModule = getDBModule();
    if (!sqliteQueryExecutor || !dbModule) {
      throw new Error(
        "Couldn't persist crypto store because database is not initialized",
      );
    }

    const result: EncryptedData = {
      message: encryptedContent.body,
      messageType: encryptedContent.type,
    };

    sqliteQueryExecutor.beginTransaction();
    try {
      sqliteQueryExecutor.setCiphertextForOutboundP2PMessage(
        messageID,
        deviceID,
        JSON.stringify(result),
      );
      persistCryptoStore(true);
      sqliteQueryExecutor.commitTransaction();
    } catch (e) {
      sqliteQueryExecutor.rollbackTransaction();
      throw e;
    }

    return result;
  },
  async decrypt(
    encryptedData: EncryptedData,
    deviceID: string,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(`No session for deviceID: ${deviceID}`);
    }

    const result = olmSession.session.decrypt(
      encryptedData.messageType,
      encryptedData.message,
    );

    persistCryptoStore();

    return result;
  },
  async decryptAndPersist(
    encryptedData: EncryptedData,
    deviceID: string,
    messageID: string,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(`No session for deviceID: ${deviceID}`);
    }

    const result = olmSession.session.decrypt(
      encryptedData.messageType,
      encryptedData.message,
    );

    const sqliteQueryExecutor = getSQLiteQueryExecutor();
    const dbModule = getDBModule();
    if (!sqliteQueryExecutor || !dbModule) {
      throw new Error(
        "Couldn't persist crypto store because database is not initialized",
      );
    }

    const receivedMessage: InboundP2PMessage = {
      messageID,
      senderDeviceID: deviceID,
      plaintext: result,
      status: 'decrypted',
    };

    sqliteQueryExecutor.beginTransaction();
    try {
      sqliteQueryExecutor.addInboundP2PMessage(receivedMessage);
      persistCryptoStore(true);
      sqliteQueryExecutor.commitTransaction();
    } catch (e) {
      sqliteQueryExecutor.rollbackTransaction();
      throw e;
    }

    return result;
  },
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedData: EncryptedData,
    sessionVersion: number,
    overwrite: boolean,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, contentSessions } = cryptoStore;

    const existingSession = contentSessions[contentIdentityKeys.ed25519];
    if (existingSession) {
      if (!overwrite && existingSession.version > sessionVersion) {
        throw new Error(olmSessionErrors.alreadyCreated);
      } else if (!overwrite && existingSession.version === sessionVersion) {
        throw new Error(olmSessionErrors.raceCondition);
      }
    }

    const session = new olm.Session();
    session.create_inbound_from(
      contentAccount,
      contentIdentityKeys.curve25519,
      initialEncryptedData.message,
    );

    contentAccount.remove_one_time_keys(session);
    const initialEncryptedMessage = session.decrypt(
      initialEncryptedData.messageType,
      initialEncryptedData.message,
    );

    contentSessions[contentIdentityKeys.ed25519] = {
      session,
      version: sessionVersion,
    };
    persistCryptoStore();

    return initialEncryptedMessage;
  },
  async contentOutboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    contentInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<OutboundSessionCreationResult> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, contentSessions } = cryptoStore;
    const existingSession = contentSessions[contentIdentityKeys.ed25519];

    const session = new olm.Session();
    if (contentInitializationInfo.oneTimeKey) {
      session.create_outbound(
        contentAccount,
        contentIdentityKeys.curve25519,
        contentIdentityKeys.ed25519,
        contentInitializationInfo.prekey,
        contentInitializationInfo.prekeySignature,
        contentInitializationInfo.oneTimeKey,
      );
    } else {
      session.create_outbound_without_otk(
        contentAccount,
        contentIdentityKeys.curve25519,
        contentIdentityKeys.ed25519,
        contentInitializationInfo.prekey,
        contentInitializationInfo.prekeySignature,
      );
    }
    const initialEncryptedData = session.encrypt(
      JSON.stringify(initialEncryptedMessageContent),
    );

    const newSessionVersion = existingSession ? existingSession.version + 1 : 1;
    contentSessions[contentIdentityKeys.ed25519] = {
      session,
      version: newSessionVersion,
    };
    persistCryptoStore();

    const encryptedData: EncryptedData = {
      message: initialEncryptedData.body,
      messageType: initialEncryptedData.type,
    };

    return { encryptedData, sessionVersion: newSessionVersion };
  },
  async notificationsOutboundSessionCreator(
    deviceID: string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<EncryptedData> {
    const dataPersistenceKey = getOlmDataContentKeyForDeviceID(deviceID);
    const dataEncryptionKeyDBLabel =
      getOlmEncryptionKeyDBLabelForDeviceID(deviceID);
    return createAndPersistNotificationsOutboundSession(
      notificationsIdentityKeys,
      notificationsInitializationInfo,
      dataPersistenceKey,
      dataEncryptionKeyDBLabel,
    );
  },
  async keyserverNotificationsSessionCreator(
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ): Promise<string> {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error('Worker not initialized');
    }

    const { notifsOlmDataContentKey, notifsOlmDataEncryptionKeyDBLabel } =
      getNotifsPersistenceKeys(cookie, keyserverID, platformDetails);

    const { message } = await createAndPersistNotificationsOutboundSession(
      notificationsIdentityKeys,
      notificationsInitializationInfo,
      notifsOlmDataContentKey,
      notifsOlmDataEncryptionKeyDBLabel,
    );

    return message;
  },
  async reassignNotificationsSession(
    prevCookie: ?string,
    newCookie: ?string,
    keyserverID: string,
  ): Promise<void> {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error('Worker not initialized');
    }

    const prevPersistenceKeys = getNotifsPersistenceKeys(
      prevCookie,
      keyserverID,
      platformDetails,
    );

    const newPersistenceKeys = getNotifsPersistenceKeys(
      newCookie,
      keyserverID,
      platformDetails,
    );

    await Promise.all([
      reassignLocalForageItem(
        prevPersistenceKeys.notifsOlmDataContentKey,
        newPersistenceKeys.notifsOlmDataContentKey,
      ),
      reassignLocalForageItem(
        prevPersistenceKeys.notifsOlmDataEncryptionKeyDBLabel,
        newPersistenceKeys.notifsOlmDataEncryptionKeyDBLabel,
      ),
    ]);
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
  async verifyMessage(
    message: string,
    signature: string,
    signingPublicKey: string,
  ): Promise<boolean> {
    if (!olmUtility) {
      throw new Error('Crypto account not initialized');
    }
    try {
      olmUtility.ed25519_verify(signingPublicKey, message, signature);
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
  async markPrekeysAsPublished(): Promise<void> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, notificationAccount } = cryptoStore;

    contentAccount.mark_prekey_as_published();
    notificationAccount.mark_prekey_as_published();

    persistCryptoStore();
  },
};

export {
  clearCryptoStore,
  processAppOlmApiRequest,
  getSignedIdentityKeysBlob,
  getNewDeviceKeyUpload,
  getExistingDeviceKeyUpload,
};
