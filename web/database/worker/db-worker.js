// @flow

import initBackupClientModule from 'backup-client';
import localforage from 'localforage';

import { restoreBackup } from './backup.js';
import {
  getClientStoreFromQueryExecutor,
  processDBStoreOperations,
} from './process-operations.js';
import {
  decryptData,
  encryptData,
  generateCryptoKey,
  importJWKKey,
  type EncryptedData,
} from '../../crypto/aes-gcm-crypto-utils.js';
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
  DEFAULT_BACKUP_CLIENT_FILENAME,
} from '../utils/constants.js';
import {
  clearSensitiveData,
  exportDatabaseContent,
  importDatabaseContent,
} from '../utils/db-utils.js';

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
  if (!!dbModule && !!sqliteQueryExecutor) {
    console.log('Database already initialized');
    return;
  }

  const newModule = dbModule
    ? dbModule
    : getDatabaseModule(commQueryExecutorFilename, databaseModuleFilePath);
  if (!dbModule) {
    dbModule = newModule;
  }

  if (encryptionKeyJWK) {
    encryptionKey = await importJWKKey(encryptionKeyJWK);
  } else {
    encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
    if (!encryptionKey) {
      const cryptoKey = await generateCryptoKey({ extractable: false });
      await localforage.setItem(SQLITE_ENCRYPTION_KEY, cryptoKey);
    }
  }

  const encryptedContent =
    await localforage.getItem<EncryptedData>(SQLITE_CONTENT);

  let dbContent = null;
  try {
    if (encryptionKey && encryptedContent) {
      dbContent = await decryptData(encryptedContent, encryptionKey);
    }
  } catch (e) {
    console.error('Error while decrypting content, clearing database content');
    await localforage.removeItem(SQLITE_CONTENT);
  }

  if (dbContent) {
    importDatabaseContent(dbContent, newModule, COMM_SQLITE_DATABASE_PATH);

    console.info(
      'Database exists and is properly encrypted, using persisted data',
    );
  } else {
    console.info('Creating fresh database');
  }
  sqliteQueryExecutor = new newModule.SQLiteQueryExecutor(
    COMM_SQLITE_DATABASE_PATH,
  );
}

async function initBackupClient(
  databaseModuleFilePath: string,
  backupClientFilename: ?string,
) {
  let modulePath;
  if (backupClientFilename) {
    modulePath = `${databaseModuleFilePath}/${backupClientFilename}`;
  } else {
    modulePath = `http://localhost:8080/${DEFAULT_BACKUP_CLIENT_FILENAME}`;
  }
  await initBackupClientModule(modulePath);
}

async function persist() {
  persistInProgress = true;
  const module = dbModule;
  if (!sqliteQueryExecutor || !module) {
    persistInProgress = false;
    throw new Error(
      'Database not initialized while persisting database content',
    );
  }

  if (!encryptionKey) {
    encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
  }

  while (persistNeeded) {
    persistNeeded = false;
    const dbData = exportDatabaseContent(module, COMM_SQLITE_DATABASE_PATH);
    if (!encryptionKey) {
      persistInProgress = false;
      throw new Error('Encryption key is missing');
    }
    const encryptedData = await encryptData(dbData, encryptionKey);
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
    const cryptoKey = await generateCryptoKey({ extractable: false });
    await localforage.setItem(SQLITE_ENCRYPTION_KEY, cryptoKey);
    return undefined;
  }

  // database operations
  if (message.type === workerRequestMessageTypes.INIT) {
    const databasePromise = initDatabase(
      message.databaseModuleFilePath,
      message.commQueryExecutorFilename,
      message.encryptionKey,
    );
    let backupClientPromise = new Promise(resolve => resolve());
    if (!(message.backupClientFilename === undefined)) {
      backupClientPromise = initBackupClient(
        message.databaseModuleFilePath,
        message.backupClientFilename,
      );
    }
    await Promise.all([databasePromise, backupClientPromise]);
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
    throw new Error(
      `Database not initialized, unable to process request type: ${message.type}`,
    );
  }

  // read-only operations
  if (message.type === workerRequestMessageTypes.GET_CLIENT_STORE) {
    return {
      type: workerResponseMessageTypes.CLIENT_STORE,
      store: getClientStoreFromQueryExecutor(sqliteQueryExecutor),
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
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      `Database not initialized, unable to process request type: ${message.type}`,
    );
  }

  if (message.type === workerRequestMessageTypes.PROCESS_STORE_OPERATIONS) {
    processDBStoreOperations(
      sqliteQueryExecutor,
      message.storeOperations,
      dbModule,
    );
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
  } else if (message.type === workerRequestMessageTypes.BACKUP_RESTORE) {
    await restoreBackup(
      sqliteQueryExecutor,
      dbModule,
      message.authMetadata,
      message.backupID,
      message.backupDataKey,
      message.backupLogDataKey,
    );
  }

  persistNeeded = true;
  if (!persistInProgress) {
    void persist();
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
