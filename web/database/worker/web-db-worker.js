// @flow

import localforage from 'localforage';
import initSqlJs from 'sql.js';

import { isDev } from 'lib/utils/dev-utils.js';

import {
  type SharedWorkerMessageEvent,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type WorkerRequestProxyMessage,
} from '../../types/worker-types.js';
import { SQLITE_CONTENT, SQLITE_ENCRYPTION_KEY } from '../utils/constants.js';
import { generateCryptoKey } from '../utils/worker-crypto-utils.js';

const localforageConfig: PartialConfig = {
  driver: localforage.INDEXEDDB,
  name: 'comm',
  storeName: 'commStorage',
  description: 'Comm encrypted database storage',
  version: '1.0',
};
localforage.config(localforageConfig);

let sqliteDb = null;

async function initDatabase() {
  const content = await localforage.getItem(SQLITE_CONTENT);

  const wasmFilePath = isDev
    ? 'http://localhost:3000/comm/compiled'
    : 'https://web.comm.app/compiled';

  const SQL = await initSqlJs({
    locateFile: file => `${wasmFilePath}/${file}`,
  });

  if (content) {
    sqliteDb = new SQL.Database(new Uint8Array(content));
  } else {
    sqliteDb = new SQL.Database();
  }

  const versionData = sqliteDb.exec('PRAGMA user_version;');
  const dbVersion = versionData[0].values[0];
  console.info(`Db version: ${dbVersion}`);
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
    await initDatabase();
    return;
  } else if (
    message.type === workerRequestMessageTypes.GENERATE_DATABASE_ENCRYPTION_KEY
  ) {
    const cryptoKey = await generateCryptoKey();
    await localforage.setItem(SQLITE_ENCRYPTION_KEY, cryptoKey);
    return;
  }

  throw new Error('Request type not supported');
}

function connectHandler(event: SharedWorkerMessageEvent) {
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
