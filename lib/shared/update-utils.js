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
  previousTimestamp: number,
): number {
  if (updateInfos.length === 0) {
    return previousTimestamp;
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
  } else if (updateData.type === updateTypes.UPDATE_CURRENT_USER) {
    return updateData.userID;
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
  } else if (updateInfo.type === updateTypes.UPDATE_CURRENT_USER) {
    return updateInfo.currentUserInfo.id;
  }
  return null;
}

function conditionKeyForUpdateData(updateData: UpdateData): ?string {
  const key = keyForUpdateData(updateData);
  if (!key) {
    return null;
  }
  return conditionKeyForUpdateDataFromKey(updateData, key);
}

function conditionKeyForUpdateDataFromKey(
  updateData: UpdateData,
  key: string,
): string {
  if (updateData.type === updateTypes.UPDATE_ENTRY) {
    return `${updateData.userID}|${key}|${updateData.targetSession}`;
  }
  return `${updateData.userID}|${key}`;
}

export {
  mostRecentUpdateTimestamp,
  keyForUpdateData,
  keyForUpdateInfo,
  conditionKeyForUpdateData,
  conditionKeyForUpdateDataFromKey,
};
