// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec } from './state-sync-spec.js';
import type { AppState } from '../../types/redux-types.js';
import { type RawThreadInfo } from '../../types/thread-types.js';
import { combineUnorderedHashes, values } from '../../utils/objects.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: StateSyncSpec<RawThreadInfo> = Object.freeze(
  {
    hashKey: 'threadInfos',
    innerHashSpec: {
      hashKey: 'threadInfo',
      deleteKey: 'deleteThreadIDs',
      rawInfosKey: 'rawThreadInfos',
    },
    selector: createSelector(
      (state: AppState) => state.integrityStore.threadHashes,
      (state: AppState) => state.integrityStore.threadHashingComplete,
      (threadHashes, threadHashingComplete) => ({
        ...threadsStateSyncSpec,
        getInfoHash: id => threadHashes[`${ashoatKeyserverID}|${id}`],
        getAllInfosHash: threadHashingComplete
          ? () => combineUnorderedHashes(values(threadHashes))
          : () => null,
        getIDs: threadHashingComplete
          ? () => Object.keys(threadHashes).map(id => id.split('|')[1])
          : () => null,
      }),
    ),
  },
);
