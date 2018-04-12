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
  } else {
    invariant(false, `unrecognized updateType ${updateData.type}`);
  }
}

export {
  mostRecentUpdateTimestamp,
  updateInfoFromUpdateData,
};
