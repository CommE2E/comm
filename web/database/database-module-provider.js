// @flow

import { DATABASE_WORKER_PATH, SQLJS_FILE_PATH } from './utils/constants.js';
import WorkerConnectionProxy from './utils/WorkerConnectionProxy.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';
import type {
  WorkerRequestMessage,
  WorkerResponseMessage,
} from '../types/worker-types.js';

declare var sqljsFilename: string;
declare var supportSqlite: string;

const databaseStatuses = Object.freeze({
  notSupported: 'NOT_SUPPORTED',
  initSuccess: 'INIT_SUCCESS',
  initInProgress: 'INIT_IN_PROGRESS',
  initError: 'INIT_ERROR',
  deleting: 'DELETING',
});

type DatabaseStatus = $Values<typeof databaseStatuses>;

class DatabaseModule {
  worker: SharedWorker;
  workerProxy: WorkerConnectionProxy;
  initPromise: Promise<void>;
  status: DatabaseStatus;

  constructor() {
    if (supportSqlite !== 'true') {
      this.status = databaseStatuses.notSupported;
    }
    this.worker = new SharedWorker(DATABASE_WORKER_PATH);
    this.worker.onerror = this.onError;
    this.workerProxy = new WorkerConnectionProxy(
      this.worker.port,
      this.onError,
    );
    this.status = databaseStatuses.initInProgress;

    const origin = window.location.origin;

    // can not await in constructor - starting a promise
    this.initPromise = this.workerProxy
      .scheduleOnWorker({
        type: workerRequestMessageTypes.INIT,
        sqljsFilePath: `${origin}${SQLJS_FILE_PATH}`,
        sqljsFilename,
      })
      .then(() => {
        this.status = databaseStatuses.initSuccess;
        console.info('Database initialization success');
      })
      .catch(error => {
        this.status = databaseStatuses.initError;
        console.error(`Database initialization failure`, error);
      });
  }

  onError: (error: Error) => void = error => {
    console.error(error);
  };

  async clearSensitiveData(): Promise<void> {
    this.status = databaseStatuses.deleting;
    await this.workerProxy.scheduleOnWorker({
      type: workerRequestMessageTypes.CLEAR_SENSITIVE_DATA,
    });
    const origin = window.location.origin;
    try {
      await this.workerProxy.scheduleOnWorker({
        type: workerRequestMessageTypes.INIT,
        sqljsFilePath: `${origin}${SQLJS_FILE_PATH}`,
        sqljsFilename,
      });

      this.status = databaseStatuses.initSuccess;
    } catch (error) {
      this.status = databaseStatuses.initError;
      console.error(`Database initialization failure`, error);
    }
  }

  async schedule(
    payload: WorkerRequestMessage,
  ): Promise<?WorkerResponseMessage> {
    if (this.status === databaseStatuses.notSupported) {
      throw new Error('Database not supported');
    }
    if (this.status === databaseStatuses.deleting) {
      throw new Error('Database being deleted');
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

const databaseModule: DatabaseModule = new DatabaseModule();

export { databaseModule };
