// @flow

import type { UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  UserUpdateInfo,
  UserRawUpdateInfo,
  UserUpdateData,
} from '../../types/update-types.js';

export const updateUserSpec: UpdateSpec<
  UserUpdateInfo,
  UserRawUpdateInfo,
  UserUpdateData,
> = Object.freeze({
  rawUpdateInfoFromRow(row: Object) {
    const content = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_USER,
      id: row.id.toString(),
      time: row.time,
      updatedUserID: content.updatedUserID,
    };
  },
  entitiesToFetch(info: UserRawUpdateInfo) {
    return {
      userID: info.updatedUserID,
    };
  },
  updateContentForServerDB(data: UserUpdateData) {
    const { updatedUserID } = data;
    return JSON.stringify({ updatedUserID });
  },
  updateInfoFromRawInfo(info: UserRawUpdateInfo) {
    return {
      type: updateTypes.UPDATE_USER,
      id: info.id,
      time: info.time,
      updatedUserID: info.updatedUserID,
    };
  },
});
