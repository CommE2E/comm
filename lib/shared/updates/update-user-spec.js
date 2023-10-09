// @flow

import type { UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  UserUpdateInfo,
  UserRawUpdateInfo,
} from '../../types/update-types.js';

export const updateUserSpec: UpdateSpec<UserUpdateInfo, UserRawUpdateInfo> =
  Object.freeze({
    rawUpdateInfoFromRow(row: Object) {
      const content = JSON.parse(row.content);
      return {
        type: updateTypes.UPDATE_USER,
        id: row.id.toString(),
        time: row.time,
        updatedUserID: content.updatedUserID,
      };
    },
  });
