// @flow

import { createTransform } from 'redux-persist';
import type { Transform } from 'redux-persist/es/types.js';

import type {
  KeyserverInfo,
  KeyserverStore,
} from '../../types/keyserver-types.js';
import { defaultConnectionInfo } from '../../types/socket-types.js';

export type PersistedKeyserverInfo = Omit<
  KeyserverInfo,
  'connection' | 'sessionID',
>;
export type PersistedKeyserverStore = {
  +keyserverInfos: { +[key: string]: PersistedKeyserverInfo },
};

function transformKeyserverInfoToPersistedKeyserverInfo(
  keyserverInfo: KeyserverInfo,
): PersistedKeyserverInfo {
  const { connection, sessionID, ...rest } = keyserverInfo;
  return rest;
}

function transformPersistedKeyserverInfoToKeyserverInfo(
  persistedKeyserverInfo: PersistedKeyserverInfo,
): KeyserverInfo {
  return {
    ...persistedKeyserverInfo,
    connection: defaultConnectionInfo,
    updatesCurrentAsOf: persistedKeyserverInfo.updatesCurrentAsOf ?? 0,
  };
}

function transformKeyserverStoreToPersistedKeyserverStore(
  state: KeyserverStore,
): PersistedKeyserverStore {
  const keyserverInfos: { [string]: PersistedKeyserverInfo } = {};
  for (const key in state.keyserverInfos) {
    keyserverInfos[key] = transformKeyserverInfoToPersistedKeyserverInfo(
      state.keyserverInfos[key],
    );
  }
  return {
    ...state,
    keyserverInfos,
  };
}

function transformPersistedKeyserverStoreToKeyserverStore(
  state: PersistedKeyserverStore,
): KeyserverStore {
  const keyserverInfos: { [string]: KeyserverInfo } = {};
  for (const key in state.keyserverInfos) {
    keyserverInfos[key] = transformPersistedKeyserverInfoToKeyserverInfo(
      state.keyserverInfos[key],
    );
  }
  return {
    ...state,
    keyserverInfos,
  };
}

const keyserverStoreTransform: Transform = createTransform(
  transformKeyserverStoreToPersistedKeyserverStore,
  transformPersistedKeyserverStoreToKeyserverStore,
  { whitelist: ['keyserverStore'] },
);

export {
  transformKeyserverInfoToPersistedKeyserverInfo,
  transformPersistedKeyserverInfoToKeyserverInfo,
  keyserverStoreTransform,
};
