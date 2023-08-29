// @flow

import type { StateSyncSpec } from './state-sync-spec.js';

export const threadsStateSyncSpec: StateSyncSpec<> = Object.freeze({
  hashKey: 'threadInfos',
  innerHashSpec: {
    hashKey: 'threadInfo',
    deleteKey: 'deleteThreadIDs',
    rawInfosKey: 'rawThreadInfos',
  },
});
