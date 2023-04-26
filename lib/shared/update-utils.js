// @flow

import invariant from 'invariant';
import _maxBy from 'lodash/fp/maxBy.js';

import {
  type ServerUpdateInfo,
  type UpdateData,
  type RawUpdateInfo,
  updateTypes,
} from '../types/update-types.js';

function mostRecentUpdateTimestamp(
  updateInfos: ServerUpdateInfo[],
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
  } else if (updateData.type === updateTypes.DELETE_ACCOUNT) {
    return updateData.deletedUserID;
  } else if (updateData.type === updateTypes.UPDATE_USER) {
    return updateData.updatedUserID;
  }
  return null;
}

function keyForUpdateInfo(updateInfo: ServerUpdateInfo): ?string {
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
    invariant(id, 'should be set');
    return id;
  } else if (updateInfo.type === updateTypes.UPDATE_CURRENT_USER) {
    return updateInfo.currentUserInfo.id;
  } else if (updateInfo.type === updateTypes.DELETE_ACCOUNT) {
    return updateInfo.deletedUserID;
  } else if (updateInfo.type === updateTypes.UPDATE_USER) {
    return updateInfo.updatedUserID;
  }
  return null;
}

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function rawUpdateInfoFromUpdateData(
  updateData: UpdateData,
  id: string,
): RawUpdateInfo {
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
      threadID: updateData.threadID,
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
  } else if (updateData.type === updateTypes.JOIN_THREAD) {
    return {
      type: updateTypes.JOIN_THREAD,
      id,
      time: updateData.time,
      threadID: updateData.threadID,
    };
  } else if (updateData.type === updateTypes.BAD_DEVICE_TOKEN) {
    return {
      type: updateTypes.BAD_DEVICE_TOKEN,
      id,
      time: updateData.time,
      deviceToken: updateData.deviceToken,
    };
  } else if (updateData.type === updateTypes.UPDATE_ENTRY) {
    return {
      type: updateTypes.UPDATE_ENTRY,
      id,
      time: updateData.time,
      entryID: updateData.entryID,
    };
  } else if (updateData.type === updateTypes.UPDATE_CURRENT_USER) {
    return {
      type: updateTypes.UPDATE_CURRENT_USER,
      id,
      time: updateData.time,
    };
  } else if (updateData.type === updateTypes.UPDATE_USER) {
    return {
      type: updateTypes.UPDATE_USER,
      id,
      time: updateData.time,
      updatedUserID: updateData.updatedUserID,
    };
  } else {
    invariant(false, `unrecognized updateType ${updateData.type}`);
  }
}

export {
  mostRecentUpdateTimestamp,
  keyForUpdateData,
  keyForUpdateInfo,
  rawUpdateInfoFromUpdateData,
};
