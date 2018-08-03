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

function keyForUpdateData(updateData: UpdateData): ?string {
  if (
    updateData.type === updateTypes.UPDATE_THREAD ||
    updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS ||
    updateData.type === updateTypes.DELETE_THREAD ||
    updateData.type === updateTypes.JOIN_THREAD
  ) {
    return updateData.threadID;
  } else if (updateData.type === updateTypes.UPDATE_ENTRY) {
    return updateData.entryID;
  }
  return null;
}

function keyForUpdateInfo(updateInfo: UpdateInfo): ?string {
  if (
    updateInfo.type === updateTypes.UPDATE_THREAD ||
    updateInfo.type === updateTypes.JOIN_THREAD
  ) {
    return updateInfo.threadInfo.id;
  } else if (
    updateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS ||
    updateInfo.type === updateTypes.DELETE_THREAD
  ) {
    return updateInfo.threadID;
  } else if (updateInfo.type === updateTypes.UPDATE_ENTRY) {
    const { id } = updateInfo.entryInfo;
    invariant(id, "should be set");
    return id;
  }
  return null;
}

function conditionKeyForUpdateData(updateData: UpdateData): ?string {
  const key = keyForUpdateData(updateData);
  return key ? `${updateData.userID}|${key}` : null;
}

export {
  mostRecentUpdateTimestamp,
  keyForUpdateData,
  keyForUpdateInfo,
  conditionKeyForUpdateData,
};
