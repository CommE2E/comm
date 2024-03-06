// @flow

import olm from '@commapp/olm';
import uuid from 'uuid';

import type {
  CryptoStore,
  PickledOLMAccount,
  OLMIdentityKeys,
  IdentityKeysBlob,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type { IdentityDeviceKeyUpload } from 'lib/types/identity-service-types.js';
import { retrieveAccountKeysSet } from 'lib/utils/olm-utils.js';

import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import type { EmscriptenModule } from '../types/module';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

let cryptoStore: ?CryptoStore = null;

function clearCryptoStore() {
  cryptoStore = null;
}

function persistCryptoStore(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
) {
  if (!cryptoStore) {
    throw new Error("CryptoStore doesn't exist");
  }

  const { primaryAccount, notificationAccount } = cryptoStore;

  try {
    sqliteQueryExecutor.storeOlmPersistAccount(
      true,
      JSON.stringify(primaryAccount),
    );
    sqliteQueryExecutor.storeOlmPersistAccount(
      false,
      JSON.stringify(notificationAccount),
    );
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }
}

function getOlmPersistedAccount(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  isContentAccount: boolean,
): {
  account: PickledOLMAccount,
  identityKeys: OLMIdentityKeys,
} {
  const olmAccount = new olm.Account();
  let account: PickledOLMAccount;

  let accountDBString;
  try {
    accountDBString =
      sqliteQueryExecutor.getOlmPersistAccountDataWeb(isContentAccount);
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  if (accountDBString.isNull) {
    olmAccount.create();
    const accountPicklingKey = uuid.v4();
    account = {
      picklingKey: accountPicklingKey,
      pickledAccount: olmAccount.pickle(accountPicklingKey),
    };
  } else {
    account = JSON.parse(accountDBString.value);
    olmAccount.unpickle(account.picklingKey, account.pickledAccount);
  }

  const identityKeys: OLMIdentityKeys = JSON.parse(olmAccount.identity_keys());

  return {
    account,
    identityKeys,
  };
}

async function initializeCryptoAccount(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  olmWasmPath: string,
  initialCryptoStore: ?CryptoStore,
) {
  await olm.init({ locateFile: () => olmWasmPath });

  if (initialCryptoStore) {
    cryptoStore = initialCryptoStore;
    persistCryptoStore(sqliteQueryExecutor, dbModule);
    return;
  }

  const primaryAccountResult = getOlmPersistedAccount(
    sqliteQueryExecutor,
    dbModule,
    true,
  );
  const notifAccountResult = getOlmPersistedAccount(
    sqliteQueryExecutor,
    dbModule,
    false,
  );

  cryptoStore = {
    primaryAccount: primaryAccountResult.account,
    primaryIdentityKeys: primaryAccountResult.identityKeys,
    notificationAccount: notifAccountResult.account,
    notificationIdentityKeys: notifAccountResult.identityKeys,
  };

  persistCryptoStore(sqliteQueryExecutor, dbModule);
}

function getSignedIdentityKeysBlob(): SignedIdentityKeysBlob {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const { primaryAccount, primaryIdentityKeys, notificationIdentityKeys } =
    cryptoStore;

  const primaryOLMAccount = new olm.Account();
  primaryOLMAccount.unpickle(
    primaryAccount.picklingKey,
    primaryAccount.pickledAccount,
  );

  const identityKeysBlob: IdentityKeysBlob = {
    primaryIdentityPublicKeys: primaryIdentityKeys,
    notificationIdentityPublicKeys: notificationIdentityKeys,
  };

  const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: payloadToBeSigned,
    signature: primaryOLMAccount.sign(payloadToBeSigned),
  };

  return signedIdentityKeysBlob;
}

function getDeviceKeyUpload(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
): IdentityDeviceKeyUpload {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }
  const { primaryAccount, notificationAccount, ...rest } = cryptoStore;

  const signedIdentityKeysBlob = getSignedIdentityKeysBlob();

  const primaryOLMAccount = new olm.Account();
  const notificationOLMAccount = new olm.Account();
  primaryOLMAccount.unpickle(
    primaryAccount.picklingKey,
    primaryAccount.pickledAccount,
  );
  notificationOLMAccount.unpickle(
    notificationAccount.picklingKey,
    notificationAccount.pickledAccount,
  );

  const primaryAccountKeysSet = retrieveAccountKeysSet(primaryOLMAccount);
  const notificationAccountKeysSet = retrieveAccountKeysSet(
    notificationOLMAccount,
  );

  const pickledPrimaryAccount = primaryOLMAccount.pickle(
    primaryAccount.picklingKey,
  );
  const pickledNotificationAccount = notificationOLMAccount.pickle(
    notificationAccount.picklingKey,
  );

  cryptoStore = {
    ...rest,
    primaryAccount: {
      picklingKey: primaryAccount.picklingKey,
      pickledAccount: pickledPrimaryAccount,
    },
    notificationAccount: {
      picklingKey: notificationAccount.picklingKey,
      pickledAccount: pickledNotificationAccount,
    },
  };

  persistCryptoStore(sqliteQueryExecutor, dbModule);

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
  initializeCryptoAccount,
  getSignedIdentityKeysBlob,
  getDeviceKeyUpload,
};
