// @flow

import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import type { KeyserverStore } from '../types/keyserver-types.js';

function wipeKeyserverStore(oldStore: KeyserverStore): KeyserverStore {
  const keyserverInfos = {
    [authoritativeKeyserverID()]: {
      ...oldStore.keyserverInfos[authoritativeKeyserverID()],
      connection: {
        ...oldStore.keyserverInfos[authoritativeKeyserverID()].connection,
        connectionIssue: null,
        queuedActivityUpdates: [],
        lateResponses: [],
      },
      cookie: null,
    },
  };
  return {
    ...oldStore,
    keyserverInfos,
  };
}

export { wipeKeyserverStore };
