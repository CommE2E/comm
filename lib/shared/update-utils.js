// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateTypes,
} from '../types/update-types';

import _maxBy from 'lodash/fp/maxBy';
import invariant from 'invariant';

function mostRecentUpdateTimestamp(
  updateInfos: UpdateInfo[],
  lastPing: number,
): number {
  if (updateInfos.length === 0) {
    return lastPing;
  }
  return _maxBy('time')(updateInfos).time;
}

function updateInfoFromUpdateData(
  updateData: UpdateData,
  id: string,
): UpdateInfo {
  if (updateData.type === updateTypes.DELETE_ACCOUNT) {
    return {
      type: updateTypes.DELETE_ACCOUNT,
      id,
      time: updateData.time,
      deletedUserID: updateData.deletedUserID,
    };
  } else if (updateData.type === updateTypes.UPDATE_THREAD) {
    return {
      type: updateTypes.UPDATE_THREAD,
      id,
      time: updateData.time,
      threadInfo: updateData.threadInfo,
    };
  } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
    return {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      id,
      time: updateData.time,
      threadID: updateData.threadID,
      unread: updateData.unread,
    };
  } else if (updateData.type === updateTypes.DELETE_THREAD) {
    return {
      type: updateTypes.DELETE_THREAD,
      id,
      time: updateData.time,
      threadID: updateData.threadID,
    };
  } else {
    invariant(false, `unrecognized updateType ${updateData.type}`);
  }
}

export {
  mostRecentUpdateTimestamp,
  updateInfoFromUpdateData,
};
