// @flow

import invariant from 'invariant';
import localforage from 'localforage';

import {
  DATABASE_WORKER_PATH,
  WORKERS_MODULES_DIR_PATH,
  SQLITE_ENCRYPTION_KEY,
} from './utils/constants.js';
import { isDesktopSafari, isSQLiteSupported } from './utils/db-utils.js';
import WorkerConnectionProxy from './utils/worker-connection-proxy.js';
import {
  exportKeyToJWK,
  generateCryptoKey,
} from '../crypto/aes-gcm-crypto-utils.js';
import {
  workerRequestMessageTypes,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
} from '../types/worker-types.js';

declare var baseURL: string;
declare var commQueryExecutorFilename: string;
const databaseStatuses = Object.freeze({
  notRunning: 'NOT_RUNNING',
  initSuccess: 'INIT_SUCCESS',
  initInProgress: 'INIT_IN_PROGRESS',
  initError: 'INIT_ERROR',
});

type DatabaseStatus =
  | { +type: 'NOT_RUNNING' | 'INIT_SUCCESS' | 'INIT_ERROR' }
  | { +type: 'INIT_IN_PROGRESS', +initPromise: Promise<void> };

type InitOptions = { +clearDatabase: boolean };

class DatabaseModule {
  worker: ?SharedWorker;
  workerProxy: ?WorkerConnectionProxy;
  status: DatabaseStatus = { type: databaseStatuses.notRunning };

  async init({ clearDatabase }: InitOptions): Promise<void> {
    if (!isSQLiteSupported()) {
      console.warn('SQLite is not supported');
      this.status = { type: databaseStatuses.initError };
      return;
    }

    if (this.status.type === databaseStatuses.initInProgress) {
      await this.status.initPromise;
      return;
    }

    const initPromise = (async () => {
      if (clearDatabase && this.status.type === databaseStatuses.initSuccess) {
        console.info('Clearing sensitive data');
        invariant(this.workerProxy, 'Worker proxy should exist');
        await this.workerProxy.scheduleOnWorker({
          type: workerRequestMessageTypes.CLEAR_SENSITIVE_DATA,
        });
        this.status = { type: databaseStatuses.notRunning };
      }

      if (
        this.status.type === databaseStatuses.initSuccess ||
        this.status.type === databaseStatuses.initError
      ) {
        return;
      }

      this.worker = new SharedWorker(DATABASE_WORKER_PATH);
      this.worker.onerror = console.error;
      this.workerProxy = new WorkerConnectionProxy(
        this.worker.port,
        console.error,
      );

      const origin = window.location.origin;

      try {
        let encryptionKey = null;
        if (isDesktopSafari) {
          encryptionKey = await getSafariEncryptionKey();
        }
        invariant(this.workerProxy, 'Worker proxy should exist');
        await this.workerProxy.scheduleOnWorker({
          type: workerRequestMessageTypes.INIT,
          databaseModuleFilePath: `${origin}${baseURL}${WORKERS_MODULES_DIR_PATH}`,
          encryptionKey,
          commQueryExecutorFilename,
        });
        this.status = { type: databaseStatuses.initSuccess };
        console.info('Database initialization success');
      } catch (error) {
        this.status = { type: databaseStatuses.initError };
        console.error(`Database initialization failure`, error);
      }
    })();

    this.status = { type: databaseStatuses.initInProgress, initPromise };

    await initPromise;
  }

  async isDatabaseSupported(): Promise<boolean> {
    if (this.status.type === databaseStatuses.initInProgress) {
      await this.status.initPromise;
    }
    return this.status.type === databaseStatuses.initSuccess;
  }

  async schedule(
    payload: WorkerRequestMessage,
  ): Promise<?WorkerResponseMessage> {
    if (this.status.type === databaseStatuses.notRunning) {
      throw new Error('Database not running');
    }

    if (this.status.type === databaseStatuses.initInProgress) {
      await this.status.initPromise;
    }

    if (this.status.type === databaseStatuses.initError) {
      throw new Error('Database could not be initialized');
    }

    invariant(this.workerProxy, 'Worker proxy should exist');
    return this.workerProxy.scheduleOnWorker(payload);
  }
}

async function getSafariEncryptionKey(): Promise<SubtleCrypto$JsonWebKey> {
  const encryptionKey = await localforage.getItem<CryptoKey>(
    SQLITE_ENCRYPTION_KEY,
  );
  if (encryptionKey) {
    return await exportKeyToJWK(encryptionKey);
  }
  const newEncryptionKey = await generateCryptoKey({
    extractable: true,
  });
  await localforage.setItem(SQLITE_ENCRYPTION_KEY, newEncryptionKey);
  return await exportKeyToJWK(newEncryptionKey);
}

let databaseModule: ?DatabaseModule = null;
async function getDatabaseModule(): Promise<DatabaseModule> {
  if (databaseModule) {
    return databaseModule;
  }
  const newModule = new DatabaseModule();
  databaseModule = newModule;
  await newModule.init({ clearDatabase: false });
  return newModule;
}
// Start initializing the database immediately
void getDatabaseModule();

export { getDatabaseModule };
