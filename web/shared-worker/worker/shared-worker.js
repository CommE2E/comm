// @flow

import localforage from 'localforage';

import { getMessageForException } from 'lib/utils/errors.js';

import { restoreBackup } from './backup.js';
import { processAppIdentityClientRequest } from './identity-client.js';
import {
  getClientStoreFromQueryExecutor,
  processDBStoreOperations,
} from './process-operations.js';
import { clearCryptoStore, processAppOlmApiRequest } from './worker-crypto.js';
import {
  getDBModule,
  getSQLiteQueryExecutor,
  setDBModule,
  setSQLiteQueryExecutor,
  getPlatformDetails,
  setPlatformDetails,
} from './worker-database.js';
import initBackupClientModule from '../../backup-client-wasm/wasm/backup-client-wasm.js';
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
  workerOlmAPIRequests,
} from '../../types/worker-types.js';
import { workerIdentityClientRequests } from '../../types/worker-types.js';
import { getDatabaseModule } from '../db-module.js';
import { webMessageToClientDBMessageInfo } from '../types/entities.js';
import {
  COMM_SQLITE_DATABASE_PATH,
  SQLITE_STAMPED_USER_ID_KEY,
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

let persistNeeded: boolean = false;
let persistInProgress: boolean = false;

async function initDatabase(
  webworkerModulesFilePath: string,
  commQueryExecutorFilename: ?string,
  encryptionKeyJWK?: ?SubtleCrypto$JsonWebKey,
) {
  const dbModule = getDBModule();
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  if (!!dbModule && !!sqliteQueryExecutor) {
    console.log('Database already initialized');
    return;
  }

  const newModule = dbModule
    ? dbModule
    : getDatabaseModule(commQueryExecutorFilename, webworkerModulesFilePath);
  if (!dbModule) {
    setDBModule(newModule);
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
  setSQLiteQueryExecutor(
    new newModule.SQLiteQueryExecutor(COMM_SQLITE_DATABASE_PATH),
  );
}

async function initBackupClient(
  webworkerModulesFilePath: string,
  backupClientFilename: ?string,
) {
  let modulePath;
  if (backupClientFilename) {
    modulePath = `${webworkerModulesFilePath}/${backupClientFilename}`;
  } else {
    modulePath = `${webworkerModulesFilePath}/${DEFAULT_BACKUP_CLIENT_FILENAME}`;
  }
  await initBackupClientModule(modulePath);
}

async function persist() {
  persistInProgress = true;
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
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
    const dbData = exportDatabaseContent(dbModule, COMM_SQLITE_DATABASE_PATH);
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

  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();

  // database operations
  if (message.type === workerRequestMessageTypes.INIT) {
    setPlatformDetails(message.platformDetails);
    const promises = [
      initDatabase(
        message.webworkerModulesFilePath,
        message.commQueryExecutorFilename,
        message.encryptionKey,
      ),
    ];
    if (message.backupClientFilename !== undefined) {
      promises.push(
        initBackupClient(
          message.webworkerModulesFilePath,
          message.backupClientFilename,
        ),
      );
    }
    await Promise.all(promises);
    return undefined;
  } else if (message.type === workerRequestMessageTypes.CLEAR_SENSITIVE_DATA) {
    clearCryptoStore();
    encryptionKey = null;
    await localforage.clear();
    if (dbModule && sqliteQueryExecutor) {
      clearSensitiveData(
        dbModule,
        COMM_SQLITE_DATABASE_PATH,
        sqliteQueryExecutor,
      );
    }
    setSQLiteQueryExecutor(null);
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
  } else if (
    message.type === workerRequestMessageTypes.GET_SQLITE_STAMPED_USER_ID
  ) {
    return {
      type: workerResponseMessageTypes.GET_SQLITE_STAMPED_USER_ID,
      userID: sqliteQueryExecutor.getMetadata(SQLITE_STAMPED_USER_ID_KEY),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_PERSIST_STORAGE_ITEM
  ) {
    return {
      type: workerResponseMessageTypes.GET_PERSIST_STORAGE_ITEM,
      item: sqliteQueryExecutor.getPersistStorageItem(message.key),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_INBOUND_P2P_MESSAGES
  ) {
    return {
      type: workerResponseMessageTypes.GET_INBOUND_P2P_MESSAGES,
      inboundP2PMessages: sqliteQueryExecutor.getAllInboundP2PMessage(),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_OUTBOUND_P2P_MESSAGES
  ) {
    return {
      type: workerResponseMessageTypes.GET_OUTBOUND_P2P_MESSAGES,
      outboundP2PMessages: sqliteQueryExecutor.getUnsentOutboundP2PMessages(),
    };
  } else if (message.type === workerRequestMessageTypes.GET_RELATED_MESSAGES) {
    const webMessageEntities = sqliteQueryExecutor.getRelatedMessagesWeb(
      message.messageID,
    );
    return {
      type: workerResponseMessageTypes.GET_MESSAGES,
      messages: webMessageEntities.map(webMessageToClientDBMessageInfo),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_OUTBOUND_P2P_MESSAGES_BY_ID
  ) {
    return {
      type: workerResponseMessageTypes.GET_OUTBOUND_P2P_MESSAGES,
      outboundP2PMessages: sqliteQueryExecutor.getOutboundP2PMessagesByID(
        message.messageIDs,
      ),
    };
  } else if (message.type === workerRequestMessageTypes.SEARCH_MESSAGES) {
    const webMessageEntities = sqliteQueryExecutor.searchMessages(
      message.query,
      message.threadID,
      message.timestampCursor,
      message.messageIDCursor,
    );
    return {
      type: workerResponseMessageTypes.GET_MESSAGES,
      messages: webMessageEntities.map(webMessageToClientDBMessageInfo),
    };
  } else if (message.type === workerRequestMessageTypes.FETCH_MESSAGES) {
    const webMessageEntities = sqliteQueryExecutor.fetchMessagesWeb(
      message.threadID,
      message.limit,
      message.offset,
    );
    return {
      type: workerResponseMessageTypes.GET_MESSAGES,
      messages: webMessageEntities.map(webMessageToClientDBMessageInfo),
    };
  } else if (
    message.type === workerRequestMessageTypes.GET_INBOUND_P2P_MESSAGES_BY_ID
  ) {
    return {
      type: workerResponseMessageTypes.GET_INBOUND_P2P_MESSAGES,
      inboundP2PMessages: sqliteQueryExecutor.getInboundP2PMessagesByID(
        message.messageIDs,
      ),
    };
  }

  // write operations
  const isOlmAPIRequest = workerOlmAPIRequests.includes(message.type);
  const isIdentityClientRequest = workerIdentityClientRequests.includes(
    message.type,
  );
  if (
    !workerWriteRequests.includes(message.type) &&
    !isOlmAPIRequest &&
    !isIdentityClientRequest
  ) {
    throw new Error(`Request type ${message.type} not supported`);
  }
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      `Database not initialized, unable to process request type: ${message.type}`,
    );
  }

  let result;
  if (isOlmAPIRequest) {
    result = await processAppOlmApiRequest(message);
  } else if (isIdentityClientRequest) {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error(
        'Platform details not set, unable to process identity client request',
      );
    }
    result = await processAppIdentityClientRequest(
      sqliteQueryExecutor,
      dbModule,
      platformDetails,
      message,
    );
  } else if (
    message.type === workerRequestMessageTypes.PROCESS_STORE_OPERATIONS
  ) {
    processDBStoreOperations(
      sqliteQueryExecutor,
      message.storeOperations,
      dbModule,
    );
  } else if (
    message.type === workerRequestMessageTypes.STAMP_SQLITE_DB_USER_ID
  ) {
    sqliteQueryExecutor.setMetadata(SQLITE_STAMPED_USER_ID_KEY, message.userID);
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
  } else if (
    message.type === workerRequestMessageTypes.REMOVE_INBOUND_P2P_MESSAGES
  ) {
    sqliteQueryExecutor.removeInboundP2PMessages(message.ids);
  } else if (
    message.type === workerRequestMessageTypes.MARK_OUTBOUND_P2P_MESSAGE_AS_SENT
  ) {
    sqliteQueryExecutor.markOutboundP2PMessageAsSent(
      message.messageID,
      message.deviceID,
    );
  } else if (
    message.type === workerRequestMessageTypes.REMOVE_OUTBOUND_P2P_MESSAGE
  ) {
    sqliteQueryExecutor.removeOutboundP2PMessage(
      message.messageID,
      message.deviceID,
    );
  } else if (
    message.type === workerRequestMessageTypes.RESET_OUTBOUND_P2P_MESSAGES
  ) {
    let messageIDs: $ReadOnlyArray<string> = [];
    try {
      sqliteQueryExecutor.beginTransaction();
      messageIDs = sqliteQueryExecutor.resetOutboundP2PMessagesForDevice(
        message.deviceID,
      );
      sqliteQueryExecutor.commitTransaction();
    } catch (e) {
      sqliteQueryExecutor.rollbackTransaction();
      console.log('Error while resetting outbound P2P messages: ', e);
      throw e;
    }

    return {
      type: workerResponseMessageTypes.RESET_OUTBOUND_P2P_MESSAGES,
      messageIDs,
    };
  }

  persistNeeded = true;
  if (!persistInProgress) {
    void persist();
  }

  return result;
}

let currentlyProcessedMessage: ?Promise<void> = null;

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

    currentlyProcessedMessage = (async () => {
      await currentlyProcessedMessage;
      try {
        const result = await processAppRequest(message);
        port.postMessage({
          id,
          message: result,
        });
      } catch (e) {
        port.postMessage({
          id,
          error: getMessageForException(e),
        });
      }
    })();
  };
}

self.addEventListener('connect', connectHandler);
