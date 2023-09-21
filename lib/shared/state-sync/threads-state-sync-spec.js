// @flow

import { createSelector } from 'reselect';
import t from 'tcomb';

import type { StateSyncSpec } from './state-sync-spec.js';
import type { AppState } from '../../types/redux-types.js';
import {
  type RawThreadInfos,
  type RawThreadInfo,
  rawThreadInfoValidator,
} from '../../types/thread-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { combineUnorderedHashes, values } from '../../utils/objects.js';
import { ashoatKeyserverID, tID } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: StateSyncSpec<
  RawThreadInfos,
  RawThreadInfo,
> = Object.freeze({
  hashKey: 'threadInfos',
  innerHashSpec: {
    hashKey: 'threadInfo',
    deleteKey: 'deleteThreadIDs',
    rawInfosKey: 'rawThreadInfos',
  },
  convertClientToServerInfos(infos: RawThreadInfos) {
    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      t.dict(tID, rawThreadInfoValidator),
      infos,
    );
  },
  selector: createSelector(
    (state: AppState) => state.integrityStore.threadHashes,
    (state: AppState) =>
      state.integrityStore.threadHashingStatus === 'completed',
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
});
