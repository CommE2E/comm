// @flow

import olm from '@commapp/olm';
import uuid from 'uuid';

import {
  type CryptoStore,
  type PickledOLMAccount,
  type IdentityKeysBlob,
  type SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type { IdentityDeviceKeyUpload } from 'lib/types/identity-service-types.js';
import { entries } from 'lib/utils/objects.js';
import { retrieveAccountKeysSet } from 'lib/utils/olm-utils.js';

import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import { getDBModule, getSQLiteQueryExecutor } from './worker-database.js';
import {
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
} from '../../types/worker-types.js';
import type { OlmPersistSession } from '../types/sqlite-query-executor.js';

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
    throw new Error('Database not initialized');
  }
  if (!cryptoStore) {
    throw new Error("CryptoStore doesn't exist");
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
    throw new Error('Database not initialized');
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
  initialCryptoStore: ?CryptoStore,
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

  const contentAccountResult = getOrCreateOlmAccount(
    sqliteQueryExecutor.getContentAccountID(),
  );
  const contentSessions = getOlmSessions(contentAccountResult.picklingKey);
  const notificationAccountResult = getOrCreateOlmAccount(
    sqliteQueryExecutor.getNotifsAccountID(),
  );

  cryptoStore = {
    contentAccountPickleKey: contentAccountResult.picklingKey,
    contentAccount: contentAccountResult.account,
    contentSessions,
    notificationAccountPickleKey: notificationAccountResult.picklingKey,
    notificationAccount: notificationAccountResult.account,
  };

  persistCryptoStore();
}

async function processAppOlmApiRequest(
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (message.type === workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT) {
    await initializeCryptoAccount(
      message.olmWasmPath,
      message.initialCryptoStore,
    );
  }
}

function getSignedIdentityKeysBlob(): SignedIdentityKeysBlob {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const { contentAccount, notificationAccount } = cryptoStore;

  const identityKeysBlob: IdentityKeysBlob = {
    primaryIdentityPublicKeys: JSON.parse(contentAccount.identity_keys()),
    notificationIdentityPublicKeys: JSON.parse(
      notificationAccount.identity_keys(),
    ),
  };

  const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: payloadToBeSigned,
    signature: contentAccount.sign(payloadToBeSigned),
  };

  return signedIdentityKeysBlob;
}

function getDeviceKeyUpload(): IdentityDeviceKeyUpload {
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

export {
  clearCryptoStore,
  processAppOlmApiRequest,
  getSignedIdentityKeysBlob,
  getDeviceKeyUpload,
};
