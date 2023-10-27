// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import type { UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  CurrentUserUpdateInfo,
  CurrentUserRawUpdateInfo,
  CurrentUserUpdateData,
} from '../../types/update-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';

export const updateCurrentUserSpec: UpdateSpec<
  CurrentUserUpdateInfo,
  CurrentUserRawUpdateInfo,
  CurrentUserUpdateData,
> = Object.freeze({
  reduceCurrentUser(state: ?CurrentUserInfo, update: CurrentUserUpdateInfo) {
    if (!_isEqual(update.currentUserInfo)(state)) {
      return update.currentUserInfo;
    }
    return state;
  },
  rawUpdateInfoFromRow(row: Object) {
    return {
      type: updateTypes.UPDATE_CURRENT_USER,
      id: row.id.toString(),
      time: row.time,
    };
  },
  updateContentForServerDB() {
    // user column contains all the info we need to construct the UpdateInfo
    return null;
  },
});
