// @flow

import localforage from 'localforage';
import initSqlJs, { type SqliteDatabase } from 'sql.js';

import type {
  ClientDBDraftStoreOperation,
  DraftStoreOperation,
} from 'lib/types/draft-types.js';
import type { ClientDBStore } from 'lib/types/store-ops-types.js';

import {
  type SharedWorkerMessageEvent,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type WorkerRequestProxyMessage,
} from '../../types/worker-types.js';
import { getSQLiteDBVersion, setupSQLiteDB } from '../queries/db-queries.js';
import {
  getAllDrafts,
  moveDraft,
  removeAllDrafts,
  updateDraft,
} from '../queries/draft-queries.js';
import { getMetadata, setMetadata } from '../queries/metadata-queries.js';
import {
  getPersistStorageItem,
  removePersistStorageItem,
  setPersistStorageItem,
} from '../queries/storage-engine-queries.js';
import {
  CURRENT_USER_ID_KEY,
  SQLITE_CONTENT,
  SQLITE_ENCRYPTION_KEY,
} from '../utils/constants.js';
import { generateDatabaseCryptoKey } from '../utils/worker-crypto-utils.js';

const localforageConfig: PartialConfig = {
  driver: localforage.INDEXEDDB,
  name: 'comm',
  storeName: 'commStorage',
  description: 'Comm encrypted database storage',
  version: '1.0',
};
localforage.config(localforageConfig);

let sqliteDb: ?SqliteDatabase = null;

async function initDatabase(sqljsFilePath: string, sqljsFilename: ?string) {
  const content = await localforage.getItem(SQLITE_CONTENT);

  const locateFile = defaultFilename => {
    if (sqljsFilename) {
      return `${sqljsFilePath}/${sqljsFilename}`;
    }
    return `${sqljsFilePath}/${defaultFilename}`;
  };
  const SQL = await initSqlJs({
    locateFile,
  });

  if (content) {
    sqliteDb = new SQL.Database(new Uint8Array(content));
  } else {
    sqliteDb = new SQL.Database();
    setupSQLiteDB(sqliteDb);
  }

  const dbVersion = getSQLiteDBVersion(sqliteDb);
  console.info(`Db version: ${dbVersion}`);
}

function processDraftStoreOperations(
  operations: $ReadOnlyArray<ClientDBDraftStoreOperation>,
) {
  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }
  for (const operation: DraftStoreOperation of operations) {
    if (operation.type === 'remove_all') {
      removeAllDrafts(sqliteDb);
    } else if (operation.type === 'update') {
      const { key, text } = operation.payload;
      updateDraft(sqliteDb, key, text);
    } else if (operation.type === 'move') {
      const { oldKey, newKey } = operation.payload;
      moveDraft(sqliteDb, oldKey, newKey);
    } else {
      throw new Error('Unsupported draft operation');
    }
  }
}

function getClientStore(): ClientDBStore {
  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }
  return {
    drafts: getAllDrafts(sqliteDb),
    messages: [],
    threads: [],
  };
}

async function processAppRequest(
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (message.type === workerRequestMessageTypes.PING) {
    return {
      type: workerResponseMessageTypes.PONG,
      text: 'PONG',
    };
  } else if (message.type === workerRequestMessageTypes.INIT) {
    await initDatabase(message.sqljsFilePath, message.sqljsFilename);
    return;
  } else if (
    message.type === workerRequestMessageTypes.GENERATE_DATABASE_ENCRYPTION_KEY
  ) {
    const cryptoKey = await generateDatabaseCryptoKey();
    await localforage.setItem(SQLITE_ENCRYPTION_KEY, cryptoKey);
    return;
  } else if (
    message.type === workerRequestMessageTypes.PROCESS_STORE_OPERATIONS
  ) {
    const { draftStoreOperations } = message.storeOperations;
    if (draftStoreOperations) {
      processDraftStoreOperations(draftStoreOperations);
    }
    return;
  } else if (message.type === workerRequestMessageTypes.GET_CLIENT_STORE) {
    return {
      type: workerResponseMessageTypes.CLIENT_STORE,
      store: getClientStore(),
    };
  } else if (message.type === workerRequestMessageTypes.SET_CURRENT_USER_ID) {
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    setMetadata(sqliteDb, CURRENT_USER_ID_KEY, message.userID);
    return;
  } else if (message.type === workerRequestMessageTypes.GET_CURRENT_USER_ID) {
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    const userID = getMetadata(sqliteDb, CURRENT_USER_ID_KEY);
    return {
      type: workerResponseMessageTypes.GET_CURRENT_USER_ID,
      userID,
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_PERSIST_STORAGE_ITEM
  ) {
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    return {
      type: workerResponseMessageTypes.GET_PERSIST_STORAGE_ITEM,
      item: getPersistStorageItem(sqliteDb, message.key),
    };
  } else if (
    message.type === workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM
  ) {
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    setPersistStorageItem(sqliteDb, message.key, message.item);
    return;
  } else if (
    message.type === workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM
  ) {
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    removePersistStorageItem(sqliteDb, message.key);
    return;
  }

  throw new Error('Request type not supported');
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
        error: new Error('Request without identifier'),
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
        error: e,
      });
    }
  };
}

self.addEventListener('connect', connectHandler);
