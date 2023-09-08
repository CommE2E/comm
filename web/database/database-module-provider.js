// @flow

import localforage from 'localforage';

import {
  DATABASE_WORKER_PATH,
  DATABASE_MODULE_FILE_PATH,
  SQLITE_ENCRYPTION_KEY,
} from './utils/constants.js';
import { isDesktopSafari, isSQLiteSupported } from './utils/db-utils.js';
import {
  exportKeyToJWK,
  generateDatabaseCryptoKey,
} from './utils/worker-crypto-utils.js';
import WorkerConnectionProxy from './utils/WorkerConnectionProxy.js';
import {
  workerRequestMessageTypes,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
} from '../types/worker-types.js';

declare var commQueryExecutorFilename: string;
const databaseStatuses = Object.freeze({
  notRunning: 'NOT_RUNNING',
  initSuccess: 'INIT_SUCCESS',
  initInProgress: 'INIT_IN_PROGRESS',
  initError: 'INIT_ERROR',
});

type DatabaseStatus = $Values<typeof databaseStatuses>;

class DatabaseModule {
  worker: SharedWorker;
  workerProxy: WorkerConnectionProxy;
  initPromise: Promise<void>;
  status: DatabaseStatus = databaseStatuses.notRunning;

  async init({ clearDatabase }: { clearDatabase: boolean }): Promise<void> {
    if (!isSQLiteSupported()) {
      console.warn('Sqlite is not supported');
      this.status = databaseStatuses.initError;
      return;
    }

    if (clearDatabase && this.status === databaseStatuses.initSuccess) {
      await this.workerProxy.scheduleOnWorker({
        type: workerRequestMessageTypes.CLEAR_SENSITIVE_DATA,
      });
      this.status = databaseStatuses.notRunning;
    }

    if (this.status === databaseStatuses.initInProgress) {
      await this.initPromise;
      return;
    }

    if (
      status === databaseStatuses.initSuccess ||
      status === databaseStatuses.initError
    ) {
      return;
    }

    this.status = databaseStatuses.initInProgress;

    let encryptionKey = null;
    if (isDesktopSafari) {
      encryptionKey = await getSafariEncryptionKey();
    }

    this.worker = new SharedWorker(DATABASE_WORKER_PATH);
    this.worker.onerror = console.error;
    this.workerProxy = new WorkerConnectionProxy(
      this.worker.port,
      console.error,
    );

    const origin = window.location.origin;

    this.initPromise = (async () => {
      try {
        await this.workerProxy.scheduleOnWorker({
          type: workerRequestMessageTypes.INIT,
          databaseModuleFilePath: `${origin}${DATABASE_MODULE_FILE_PATH}`,
          encryptionKey,
          commQueryExecutorFilename,
        });
        this.status = databaseStatuses.initSuccess;
        console.info('Database initialization success');
      } catch (error) {
        this.status = databaseStatuses.initError;
        console.error(`Database initialization failure`, error);
      }
    })();

    await this.initPromise;
  }

  async isDatabaseSupported(): Promise<boolean> {
    if (this.status === databaseStatuses.initInProgress) {
      await this.initPromise;
    }
    return this.status === databaseStatuses.initSuccess;
  }

  async schedule(
    payload: WorkerRequestMessage,
  ): Promise<?WorkerResponseMessage> {
    if (this.status === databaseStatuses.notRunning) {
      throw new Error('Database not running');
    }

    if (this.status === databaseStatuses.initInProgress) {
      await this.initPromise;
    }

    if (this.status === databaseStatuses.initError) {
      throw new Error('Database could not be initialized');
    }

    return this.workerProxy.scheduleOnWorker(payload);
  }
}

async function getSafariEncryptionKey(): Promise<SubtleCrypto$JsonWebKey> {
  const encryptionKey = await localforage.getItem(SQLITE_ENCRYPTION_KEY);
  if (encryptionKey) {
    return await exportKeyToJWK(encryptionKey);
  }
  const newEncryptionKey = await generateDatabaseCryptoKey({
    extractable: true,
  });
  await localforage.setItem(SQLITE_ENCRYPTION_KEY, newEncryptionKey);
  return await exportKeyToJWK(newEncryptionKey);
}

let databaseModule: ?DatabaseModule = null;
async function getDatabaseModule(): Promise<DatabaseModule> {
  if (!databaseModule) {
    databaseModule = new DatabaseModule();
    await databaseModule.init({ clearDatabase: false });
  }
  return databaseModule;
}
// Start initializing the database immediately
getDatabaseModule();

export { getDatabaseModule };
