// @flow

import localforage from 'localforage';
import initSqlJs, { type SqliteDatabase } from 'sql.js';

import type { ClientDBReportStoreOperation } from 'lib/ops/report-store-ops.js';
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
  workerWriteRequests,
} from '../../types/worker-types.js';
import Module from '../_generated/CommQueryCreator.js';
import { migrate, setupSQLiteDB } from '../queries/db-queries.js';
import { getAllDrafts } from '../queries/draft-queries.js';
import { getMetadata, setMetadata } from '../queries/metadata-queries.js';
import { getAllReports } from '../queries/report-queries.js';
import {
  getPersistStorageItem,
  removePersistStorageItem,
  setPersistStorageItem,
} from '../queries/storage-engine-queries.js';
import {
  CURRENT_USER_ID_KEY,
  localforageConfig,
  SQLITE_CONTENT,
  SQLITE_ENCRYPTION_KEY,
} from '../utils/constants.js';
import {
  decryptDatabaseFile,
  encryptDatabaseFile,
  generateDatabaseCryptoKey,
  importJWKKey,
} from '../utils/worker-crypto-utils.js';

localforage.config(localforageConfig);

let sqliteDb: ?SqliteDatabase = null;
let encryptionKey: ?CryptoKey = null;
let sqliteQueryExecutor: any = null;
let dbModule: any = null;

const filename = 'dbfile.sqlite';

let persistNeeded: boolean = false;
let persistInProgress: boolean = false;

async function initDatabase(
  sqljsFilePath: string,
  sqljsFilename: ?string,
  encryptionKeyJWK?: ?SubtleCrypto$JsonWebKey,
) {
  dbModule = Module({
    locateFile: function (path) {
      return `${sqljsFilePath}/${path}`;
    },
  });

  console.log('debug: start');
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

  const locateFile = defaultFilename => {
    if (sqljsFilename) {
      return `${sqljsFilePath}/${sqljsFilename}`;
    }
    return `${sqljsFilePath}/${defaultFilename}`;
  };
  const SQL = await initSqlJs({
    locateFile,
  });

  if (dbContent) {
    sqliteDb = new SQL.Database(dbContent);
    console.info(
      'Database exists and is properly encrypted, using persisted data',
    );
    migrate(sqliteDb);

    // we have data - creating virtual file with content
    const stream = dbModule.FS.open(filename, 'w+');
    dbModule.FS.write(stream, dbContent, 0, dbContent.length, 0);
    dbModule.FS.close(stream);
  } else {
    sqliteDb = new SQL.Database();
    setupSQLiteDB(sqliteDb);
    console.info('Creating fresh database');

    // no content - database will create the file
  }

  sqliteQueryExecutor = new dbModule.CommQueryCreator(filename);
}

function processDraftStoreOperations(
  operations: $ReadOnlyArray<ClientDBDraftStoreOperation>,
) {
  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }
  for (const operation: DraftStoreOperation of operations) {
    if (operation.type === 'remove_all') {
      sqliteQueryExecutor.removeAllDrafts();
    } else if (operation.type === 'update') {
      const { key, text } = operation.payload;
      sqliteQueryExecutor.updateDraft(key, text);
    } else if (operation.type === 'move') {
      const { oldKey, newKey } = operation.payload;
      sqliteQueryExecutor.moveDraft(oldKey, newKey);
    } else {
      throw new Error('Unsupported draft operation');
    }
  }
}

function processReportStoreOperations(
  operations: $ReadOnlyArray<ClientDBReportStoreOperation>,
) {
  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }
  for (const operation: ClientDBReportStoreOperation of operations) {
    if (operation.type === 'remove_all_reports') {
      sqliteQueryExecutor.removeAllReports();
    } else if (operation.type === 'remove_reports') {
      const { ids } = operation.payload;
      //FIXME pass std::vector instead of array
      sqliteQueryExecutor.removeReports(ids);
    } else if (operation.type === 'replace_report') {
      const { id, report } = operation.payload;
      sqliteQueryExecutor.updateReport({ id, report });
    } else {
      throw new Error('Unsupported report operation');
    }
  }
}

function getClientStore(): ClientDBStore {
  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }
  return {
    drafts: getAllDrafts(sqliteQueryExecutor),
    messages: [],
    threads: [],
    messageStoreThreads: [],
    reports: getAllReports(sqliteQueryExecutor),
  };
}

async function persist() {
  persistInProgress = true;
  if (!sqliteDb) {
    persistInProgress = false;
    throw new Error('Database not initialized');
  }

  if (!encryptionKey) {
    encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
  }

  while (persistNeeded) {
    persistNeeded = false;
    const dbData = dbModule.FS.readFile(filename, { encoding: 'binary' });
    // const dbData = sqliteDb.export();
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
      message.sqljsFilePath,
      message.sqljsFilename,
      message.encryptionKey,
    );
    return undefined;
  } else if (message.type === workerRequestMessageTypes.CLEAR_SENSITIVE_DATA) {
    encryptionKey = null;
    if (sqliteDb) {
      sqliteDb.close();
    }
    await localforage.clear();
    return undefined;
  }

  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }

  // read-only operations
  if (message.type === workerRequestMessageTypes.GET_CLIENT_STORE) {
    return {
      type: workerResponseMessageTypes.CLIENT_STORE,
      store: getClientStore(),
    };
  } else if (message.type === workerRequestMessageTypes.GET_CURRENT_USER_ID) {
    return {
      type: workerResponseMessageTypes.GET_CURRENT_USER_ID,
      userID: getMetadata(sqliteDb, CURRENT_USER_ID_KEY),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_PERSIST_STORAGE_ITEM
  ) {
    return {
      type: workerResponseMessageTypes.GET_PERSIST_STORAGE_ITEM,
      item: getPersistStorageItem(sqliteDb, message.key),
    };
  }

  // write operations
  if (!workerWriteRequests.includes(message.type)) {
    throw new Error('Request type not supported');
  }

  if (message.type === workerRequestMessageTypes.PROCESS_STORE_OPERATIONS) {
    const { draftStoreOperations, reportStoreOperations } =
      message.storeOperations;
    if (draftStoreOperations) {
      processDraftStoreOperations(draftStoreOperations);
    }
    if (reportStoreOperations) {
      processReportStoreOperations(reportStoreOperations);
    }
  } else if (message.type === workerRequestMessageTypes.SET_CURRENT_USER_ID) {
    setMetadata(sqliteDb, CURRENT_USER_ID_KEY, message.userID);
  } else if (
    message.type === workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM
  ) {
    setPersistStorageItem(sqliteDb, message.key, message.item);
  } else if (
    message.type === workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM
  ) {
    removePersistStorageItem(sqliteDb, message.key);
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
