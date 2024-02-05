// @flow

import { ashoatKeyserverID } from './validation-utils.js';
import type { KeyserverStore } from '../types/keyserver-types.js';

function wipeKeyserverStore(oldStore: KeyserverStore): KeyserverStore {
  const keyserverInfos = {
    [ashoatKeyserverID]: {
      ...oldStore.keyserverInfos[ashoatKeyserverID],
      connection: {
        ...oldStore.keyserverInfos[ashoatKeyserverID].connection,
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
