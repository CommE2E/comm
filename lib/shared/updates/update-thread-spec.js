// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import t from 'tcomb';

import type { UpdateInfoFromRawInfoParams, UpdateSpec } from './update-spec.js';
import { mixedThinRawThreadInfoValidator } from '../../permissions/minimally-encoded-raw-thread-info-validators.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  ThreadUpdateInfo,
  ThreadRawUpdateInfo,
  ThreadUpdateData,
} from '../../types/update-types.js';
import { tNumber, tShape } from '../../utils/validation-utils.js';
import { threadInFilterList } from '../thread-utils.js';

export const updateThreadSpec: UpdateSpec<
  ThreadUpdateInfo,
  ThreadRawUpdateInfo,
  ThreadUpdateData,
> = Object.freeze({
  generateOpsForThreadUpdates(
    storeThreadInfos: RawThreadInfos,
    update: ThreadUpdateInfo,
  ) {
    if (_isEqual(storeThreadInfos[update.threadInfo.id])(update.threadInfo)) {
      return null;
    }
    invariant(
      update.threadInfo.minimallyEncoded,
      'update threadInfo must be minimallyEncoded',
    );
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
  reduceCalendarThreadFilters(
    filteredThreadIDs: $ReadOnlySet<string>,
    update: ThreadUpdateInfo,
  ) {
    if (
      threadInFilterList(update.threadInfo) ||
      !filteredThreadIDs.has(update.threadInfo.id)
    ) {
      return filteredThreadIDs;
    }
    return new Set(
      [...filteredThreadIDs].filter(id => id !== update.threadInfo.id),
    );
  },
  rawUpdateInfoFromRow(row: Object) {
    const { threadID } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_THREAD,
      id: row.id.toString(),
      time: row.time,
      threadID,
    };
  },
  updateContentForServerDB(data: ThreadUpdateData) {
    return JSON.stringify({ threadID: data.threadID });
  },
  entitiesToFetch(update: ThreadRawUpdateInfo) {
    return {
      threadID: update.threadID,
    };
  },
  rawInfoFromData(data: ThreadUpdateData, id: string) {
    return {
      type: updateTypes.UPDATE_THREAD,
      id,
      time: data.time,
      threadID: data.threadID,
    };
  },
  updateInfoFromRawInfo(
    info: ThreadRawUpdateInfo,
    params: UpdateInfoFromRawInfoParams,
  ) {
    const threadInfo = params.data.threadInfos[info.threadID];
    if (!threadInfo) {
      console.warn(
        "failed to hydrate updateTypes.UPDATE_THREAD because we couldn't " +
          `fetch RawThreadInfo for ${info.threadID}`,
      );
      return null;
    }
    return {
      type: updateTypes.UPDATE_THREAD,
      id: info.id,
      time: info.time,
      threadInfo,
    };
  },
  deleteCondition: new Set([
    updateTypes.UPDATE_THREAD,
    updateTypes.UPDATE_THREAD_READ_STATUS,
  ]),
  keyForUpdateData(data: ThreadUpdateData) {
    return data.threadID;
  },
  keyForUpdateInfo(info: ThreadUpdateInfo) {
    return info.threadInfo.id;
  },
  typesOfReplacedUpdatesForMatchingKey: new Set([
    updateTypes.UPDATE_THREAD_READ_STATUS,
  ]),
  infoValidator: tShape<ThreadUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_THREAD),
    id: t.String,
    time: t.Number,
    threadInfo: mixedThinRawThreadInfoValidator,
  }),
  getUpdatedThreadInfo(update: ThreadUpdateInfo) {
    return update.threadInfo;
  },
});
