// @flow

import { databaseModule } from '../database/database-module-provider.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

const commReduxStorageEngine = {
  getItem: (key: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      databaseModule
        .schedule({
          type: workerRequestMessageTypes.GET_PERSIST_STORAGE_ITEM,
          key,
        })
        .then(res => {
          if (typeof res?.item === 'string') {
            resolve(res.item);
          } else {
            reject(new Error('Wrong type returned for storage item'));
          }
        })
        .catch(e => {
          reject(e);
        });
    });
  },
  setItem: (key: string, item: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      databaseModule
        .schedule({
          type: workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM,
          key,
          item,
        })
        .then(() => {
          resolve();
        })
        .catch(e => {
          reject(e);
        });
    });
  },
  removeItem: (key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      databaseModule
        .schedule({
          type: workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM,
          key,
        })
        .then(() => {
          resolve();
        })
        .catch(e => {
          reject(e);
        });
    });
  },
};

export default commReduxStorageEngine;
