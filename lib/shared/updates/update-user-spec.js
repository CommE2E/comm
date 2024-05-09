// @flow

import t from 'tcomb';

import type { UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  UserUpdateInfo,
  UserRawUpdateInfo,
  UserUpdateData,
} from '../../types/update-types.js';
import { tNumber, tShape, tUserID } from '../../utils/validation-utils.js';

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
  rawInfoFromData(data: UserUpdateData, id: string) {
    return {
      type: updateTypes.UPDATE_USER,
      id,
      time: data.time,
      updatedUserID: data.updatedUserID,
    };
  },
  updateInfoFromRawInfo(info: UserRawUpdateInfo) {
    return {
      type: updateTypes.UPDATE_USER,
      id: info.id,
      time: info.time,
      updatedUserID: info.updatedUserID,
    };
  },
  deleteCondition: new Set([updateTypes.UPDATE_USER]),
  keyForUpdateData(data: UserUpdateData) {
    return data.updatedUserID;
  },
  keyForUpdateInfo(info: UserUpdateInfo) {
    return info.updatedUserID;
  },
  typesOfReplacedUpdatesForMatchingKey: null,
  infoValidator: tShape<UserUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_USER),
    id: t.String,
    time: t.Number,
    updatedUserID: tUserID,
  }),
});
