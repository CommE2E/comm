// @flow

import invariant from 'invariant';
import localforage from 'localforage';

import { getConfig } from 'lib/utils/config.js';

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
declare var backupClientFilename: string;

const sharedWorkerStatuses = Object.freeze({
  NOT_RUNNING: 'NOT_RUNNING',
  INIT_SUCCESS: 'INIT_SUCCESS',
  INIT_IN_PROGRESS: 'INIT_IN_PROGRESS',
  INIT_ERROR: 'INIT_ERROR',
});

type SharedWorkerStatus =
  | { +type: 'NOT_RUNNING' | 'INIT_SUCCESS' | 'INIT_ERROR' }
  | { +type: 'INIT_IN_PROGRESS', +initPromise: Promise<void> };

type InitOptions = { +clearDatabase: boolean, +markAsCorrupted?: boolean };

class CommSharedWorker {
  worker: ?SharedWorker;
  workerProxy: ?WorkerConnectionProxy;
  status: SharedWorkerStatus = { type: sharedWorkerStatuses.NOT_RUNNING };

  async init({ clearDatabase, markAsCorrupted }: InitOptions): Promise<void> {
    if (!isSQLiteSupported()) {
      console.warn('SQLite is not supported');
      this.status = { type: sharedWorkerStatuses.INIT_ERROR };
      return;
    }

    if (this.status.type === sharedWorkerStatuses.INIT_IN_PROGRESS) {
      await this.status.initPromise;
      return;
    }

    if (
      (this.status.type === sharedWorkerStatuses.INIT_SUCCESS &&
        !clearDatabase) ||
      this.status.type === sharedWorkerStatuses.INIT_ERROR
    ) {
      return;
    }

    const initPromise = (async () => {
      if (
        clearDatabase &&
        this.status.type === sharedWorkerStatuses.INIT_SUCCESS
      ) {
        console.info('Clearing sensitive data');
        invariant(this.workerProxy, 'Worker proxy should exist');
        await this.workerProxy.scheduleOnWorker({
          type: workerRequestMessageTypes.CLEAR_SENSITIVE_DATA,
        });
      }

      const platformDetails = getConfig().platformDetails;
      const codeVersion = platformDetails.codeVersion ?? '';
      const workerName = `comm-app-shared-worker-${codeVersion}`;

      this.worker = new SharedWorker(DATABASE_WORKER_PATH, workerName);
      this.worker.onerror = console.error;
      this.workerProxy = new WorkerConnectionProxy(
        this.worker.port,
        console.error,
      );

      const origin = window.location.origin;

      if (markAsCorrupted) {
        this.status = { type: sharedWorkerStatuses.INIT_ERROR };
        return;
      }

      try {
        let encryptionKey = null;
        if (isDesktopSafari) {
          encryptionKey = await getSafariEncryptionKey();
        }
        invariant(this.workerProxy, 'Worker proxy should exist');
        await this.workerProxy.scheduleOnWorker({
          type: workerRequestMessageTypes.INIT,
          platformDetails,
          webworkerModulesFilePath: `${origin}${baseURL}${WORKERS_MODULES_DIR_PATH}`,
          encryptionKey,
          commQueryExecutorFilename,
          backupClientFilename,
        });
        this.status = { type: sharedWorkerStatuses.INIT_SUCCESS };
        console.info('Database initialization success');
      } catch (error) {
        this.status = { type: sharedWorkerStatuses.INIT_ERROR };
        console.error(`Database initialization failure`, error);
      }
    })();

    this.status = { type: sharedWorkerStatuses.INIT_IN_PROGRESS, initPromise };

    await initPromise;
  }

  async isSupported(): Promise<boolean> {
    if (this.status.type === sharedWorkerStatuses.INIT_IN_PROGRESS) {
      await this.status.initPromise;
    }
    return this.status.type === sharedWorkerStatuses.INIT_SUCCESS;
  }

  async schedule(
    payload: WorkerRequestMessage,
  ): Promise<?WorkerResponseMessage> {
    if (this.status.type === sharedWorkerStatuses.NOT_RUNNING) {
      throw new Error('Database not running');
    }

    if (this.status.type === sharedWorkerStatuses.INIT_IN_PROGRESS) {
      await this.status.initPromise;
    }

    if (this.status.type === sharedWorkerStatuses.INIT_ERROR) {
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

let sharedWorker: ?CommSharedWorker = null;
async function getCommSharedWorker(): Promise<CommSharedWorker> {
  if (sharedWorker) {
    return sharedWorker;
  }
  const newModule = new CommSharedWorker();
  sharedWorker = newModule;
  await newModule.init({ clearDatabase: false });
  return newModule;
}

export { CommSharedWorker, getCommSharedWorker };
