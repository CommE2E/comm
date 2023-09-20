// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import type { UpdateSpec } from './update-spec.js';
import type { RawEntryInfo } from '../../types/entry-types.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type { ThreadJoinUpdateInfo } from '../../types/update-types.js';

export const joinThreadSpec: UpdateSpec<ThreadJoinUpdateInfo> = Object.freeze({
  generateOpsForThreadUpdates(
    storeThreadInfos: RawThreadInfos,
    update: ThreadJoinUpdateInfo,
  ) {
    if (_isEqual(storeThreadInfos[update.threadInfo.id])(update.threadInfo)) {
      return null;
    }
    return [
      {
        type: 'replace',
        payload: {
          id: update.threadInfo.id,
          threadInfo: update.threadInfo,
        },
      },
    ];
  },
  mergeEntryInfos(
    entryIDs: Set<string>,
    mergedEntryInfos: Array<RawEntryInfo>,
    update: ThreadJoinUpdateInfo,
  ) {
    for (const entryInfo of update.rawEntryInfos) {
      const entryID = entryInfo.id;
      if (!entryID || entryIDs.has(entryID)) {
        continue;
      }
      mergedEntryInfos.push(entryInfo);
      entryIDs.add(entryID);
    }
  },
});
