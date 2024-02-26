// @flow

import olm from '@commapp/olm';
import uuid from 'uuid';

import type {
  CryptoStore,
  PickledOLMAccount,
  OLMIdentityKeys,
} from 'lib/types/crypto-types.js';

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

export { clearCryptoStore, initializeCryptoAccount };
