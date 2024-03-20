// @flow

import olm from '@commapp/olm';
import uuid from 'uuid';

import type {
  CryptoStore,
  PickledOLMAccount,
  IdentityKeysBlob,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type {
  IdentityNewDeviceKeyUpload,
  IdentityExistingDeviceKeyUpload,
} from 'lib/types/identity-service-types.js';
import {
  retrieveIdentityKeysAndPrekeys,
  retrieveAccountKeysSet,
} from 'lib/utils/olm-utils.js';

import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import { getDBModule, getSQLiteQueryExecutor } from './worker-database.js';
import {
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
} from '../../types/worker-types.js';

type WorkerCryptoStore = {
  +contentAccountPickleKey: string,
  +contentAccount: olm.Account,
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
    notificationAccountPickleKey,
    notificationAccount,
  } = cryptoStore;

  const pickledContentAccount: PickledOLMAccount = {
    picklingKey: contentAccountPickleKey,
    pickledAccount: contentAccount.pickle(contentAccountPickleKey),
  };

  const pickledNotificationAccount: PickledOLMAccount = {
    picklingKey: notificationAccountPickleKey,
    pickledAccount: notificationAccount.pickle(notificationAccountPickleKey),
  };

  try {
    sqliteQueryExecutor.storeOlmPersistAccount(
      sqliteQueryExecutor.getContentAccountID(),
      JSON.stringify(pickledContentAccount),
    );
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
  const notificationAccountResult = getOrCreateOlmAccount(
    sqliteQueryExecutor.getNotifsAccountID(),
  );

  cryptoStore = {
    contentAccountPickleKey: contentAccountResult.picklingKey,
    contentAccount: contentAccountResult.account,
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

export {
  clearCryptoStore,
  processAppOlmApiRequest,
  getSignedIdentityKeysBlob,
  getNewDeviceKeyUpload,
  getExistingDeviceKeyUpload,
};
