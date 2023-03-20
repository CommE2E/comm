// @flow

import localforage from 'localforage';
import initSqlJs, { type SqliteDatabase } from 'sql.js';

import {
  type SharedWorkerMessageEvent,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type WorkerRequestProxyMessage,
} from '../../types/worker-types.js';
import { getSQLiteDBVersion } from '../queries/db-queries.js';
import { SQLITE_CONTENT } from '../utils/constants.js';

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
  }

  const dbVersion = getSQLiteDBVersion(sqliteDb);
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
    await initDatabase(message.sqljsFilePath, message.sqljsFilename);
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
