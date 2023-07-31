// @flow

import localforage from 'localforage';

import {
  getClientStore,
  processDBStoreOperations,
} from './process-operations.js';
import {
  type SharedWorkerMessageEvent,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type WorkerRequestProxyMessage,
  workerWriteRequests,
} from '../../types/worker-types.js';
import { getDatabaseModule } from '../db-module.js';
import { type EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import {
  COMM_SQLITE_DATABASE_PATH,
  CURRENT_USER_ID_KEY,
  localforageConfig,
  SQLITE_CONTENT,
  SQLITE_ENCRYPTION_KEY,
} from '../utils/constants.js';
import {
  clearSensitiveData,
  exportDatabaseContent,
  importDatabaseContent,
} from '../utils/db-utils.js';
import {
  decryptDatabaseFile,
  encryptDatabaseFile,
  generateDatabaseCryptoKey,
  importJWKKey,
} from '../utils/worker-crypto-utils.js';

localforage.config(localforageConfig);

let encryptionKey: ?CryptoKey = null;

let sqliteQueryExecutor: ?SQLiteQueryExecutor = null;
let dbModule: ?EmscriptenModule = null;

let persistNeeded: boolean = false;
let persistInProgress: boolean = false;

async function initDatabase(
  databaseModuleFilePath: string,
  commQueryExecutorFilename: ?string,
  encryptionKeyJWK?: ?SubtleCrypto$JsonWebKey,
) {
  dbModule = getDatabaseModule(
    commQueryExecutorFilename,
    databaseModuleFilePath,
  );

  try {
    const result = dbModule.CommQueryExecutor.testDBOperation();
    console.log(result);
  } catch (e) {
    console.error(e);
  }

  if (encryptionKeyJWK) {
    encryptionKey = await importJWKKey(encryptionKeyJWK);
  } else {
    encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
    if (!encryptionKey) {
      const cryptoKey = await generateDatabaseCryptoKey({ extractable: false });
      await localforage.setItem(SQLITE_ENCRYPTION_KEY, cryptoKey);
    }
  }

  const encryptedContent = await localforage.getItem(SQLITE_CONTENT);

  let dbContent = null;
  try {
    if (encryptionKey && encryptedContent) {
      dbContent = await decryptDatabaseFile(encryptedContent, encryptionKey);
    }
  } catch (e) {
    console.error('Error while decrypting content, clearing database content');
    await localforage.removeItem(SQLITE_CONTENT);
  }

  if (dbContent) {
    importDatabaseContent(dbContent, dbModule, COMM_SQLITE_DATABASE_PATH);

    console.info(
      'Database exists and is properly encrypted, using persisted data',
    );
  } else {
    console.info('Creating fresh database');
  }
  sqliteQueryExecutor = new dbModule.SQLiteQueryExecutor(
    COMM_SQLITE_DATABASE_PATH,
  );
}

async function persist() {
  persistInProgress = true;
  if (!sqliteQueryExecutor || !dbModule) {
    persistInProgress = false;
    throw new Error('Database not initialized');
  }

  if (!encryptionKey) {
    encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
  }

  while (persistNeeded) {
    persistNeeded = false;
    const dbData = exportDatabaseContent(dbModule, COMM_SQLITE_DATABASE_PATH);
    if (!encryptionKey) {
      persistInProgress = false;
      throw new Error('Encryption key is missing');
    }
    const encryptedData = await encryptDatabaseFile(dbData, encryptionKey);
    await localforage.setItem(SQLITE_CONTENT, encryptedData);
  }
  persistInProgress = false;
}

async function processAppRequest(
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  // non-database operations
  if (message.type === workerRequestMessageTypes.PING) {
    return {
      type: workerResponseMessageTypes.PONG,
      text: 'PONG',
    };
  } else if (
    message.type === workerRequestMessageTypes.GENERATE_DATABASE_ENCRYPTION_KEY
  ) {
    const cryptoKey = await generateDatabaseCryptoKey({ extractable: false });
    await localforage.setItem(SQLITE_ENCRYPTION_KEY, cryptoKey);
    return undefined;
  }

  // database operations
  if (message.type === workerRequestMessageTypes.INIT) {
    await initDatabase(
      message.databaseModuleFilePath,
      message.commQueryExecutorFilename,
      message.encryptionKey,
    );
    return undefined;
  } else if (message.type === workerRequestMessageTypes.CLEAR_SENSITIVE_DATA) {
    encryptionKey = null;
    await localforage.clear();
    if (dbModule && sqliteQueryExecutor) {
      clearSensitiveData(
        dbModule,
        COMM_SQLITE_DATABASE_PATH,
        sqliteQueryExecutor,
      );
    }
    sqliteQueryExecutor = null;
    return undefined;
  }

  if (!sqliteQueryExecutor) {
    throw new Error('Database not initialized');
  }

  // read-only operations
  if (message.type === workerRequestMessageTypes.GET_CLIENT_STORE) {
    return {
      type: workerResponseMessageTypes.CLIENT_STORE,
      store: getClientStore(sqliteQueryExecutor),
    };
  } else if (message.type === workerRequestMessageTypes.GET_CURRENT_USER_ID) {
    return {
      type: workerResponseMessageTypes.GET_CURRENT_USER_ID,
      userID: sqliteQueryExecutor.getMetadata(CURRENT_USER_ID_KEY),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_PERSIST_STORAGE_ITEM
  ) {
    return {
      type: workerResponseMessageTypes.GET_PERSIST_STORAGE_ITEM,
      item: sqliteQueryExecutor.getPersistStorageItem(message.key),
    };
  }

  // write operations
  if (!workerWriteRequests.includes(message.type)) {
    throw new Error('Request type not supported');
  }
  if (!sqliteQueryExecutor) {
    throw new Error('Database not initialized');
  }

  if (message.type === workerRequestMessageTypes.PROCESS_STORE_OPERATIONS) {
    processDBStoreOperations(sqliteQueryExecutor, message.storeOperations);
  } else if (message.type === workerRequestMessageTypes.SET_CURRENT_USER_ID) {
    sqliteQueryExecutor.setMetadata(CURRENT_USER_ID_KEY, message.userID);
  } else if (
    message.type === workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM
  ) {
    sqliteQueryExecutor.setPersistStorageItem(message.key, message.item);
  } else if (
    message.type === workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM
  ) {
    sqliteQueryExecutor.removePersistStorageItem(message.key);
  }

  persistNeeded = true;
  if (!persistInProgress) {
    persist();
  }

  return undefined;
}

function connectHandler(event: SharedWorkerMessageEvent) {
  if (!event.ports.length) {
    return;
  }
  const port: MessagePort = event.ports[0];
  console.log('Web database worker alive!');

  port.onmessage = async function (messageEvent: MessageEvent) {
    const data: WorkerRequestProxyMessage = (messageEvent.data: any);
    const { id, message } = data;

    if (!id) {
      port.postMessage({
        error: 'Request without identifier',
      });
    }

    try {
      const result = await processAppRequest(message);
      port.postMessage({
        id,
        message: result,
      });
    } catch (e) {
      port.postMessage({
        id,
        error: e.message,
      });
    }
  };
}

self.addEventListener('connect', connectHandler);
