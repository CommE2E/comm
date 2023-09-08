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
import type { AppState } from '../redux/redux-setup.js';
import {
  workerRequestMessageTypes,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
} from '../types/worker-types.js';

declare var commQueryExecutorFilename: string;
declare var preloadedState: AppState;

const databaseStatuses = Object.freeze({
  notSupported: 'NOT_SUPPORTED',
  initSuccess: 'INIT_SUCCESS',
  initInProgress: 'INIT_IN_PROGRESS',
  initError: 'INIT_ERROR',
});

type DatabaseStatus = $Values<typeof databaseStatuses>;

class DatabaseModule {
  worker: SharedWorker;
  workerProxy: WorkerConnectionProxy;
  initPromise: Promise<void>;
  status: DatabaseStatus;

  constructor() {
    const currentLoggedInUserID = preloadedState.currentUserInfo?.anonymous
      ? undefined
      : preloadedState.currentUserInfo?.id;
    const isSupported = isSQLiteSupported(currentLoggedInUserID);

    if (!isSupported || isDesktopSafari) {
      this.status = databaseStatuses.notSupported;
    } else {
      this.init();
    }
  }

  init(encryptionKey?: ?SubtleCrypto$JsonWebKey) {
    this.status = databaseStatuses.initInProgress;
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
  }

  async initDBForLoggedInUser(currentLoggedInUserID: ?string) {
    if (this.status === databaseStatuses.initSuccess) {
      return;
    }

    if (
      this.status === databaseStatuses.notSupported &&
      isSQLiteSupported(currentLoggedInUserID)
    ) {
      let encryptionKey = null;
      if (isDesktopSafari) {
        encryptionKey = await getSafariEncryptionKey();
      }

      this.init(encryptionKey);
    }
  }

  async clearSensitiveData(): Promise<void> {
    this.status = databaseStatuses.notSupported;
    await this.workerProxy.scheduleOnWorker({
      type: workerRequestMessageTypes.CLEAR_SENSITIVE_DATA,
    });
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
    if (this.status === databaseStatuses.notSupported) {
      throw new Error('Database not supported');
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
  }
  return databaseModule;
}

export { getDatabaseModule };
