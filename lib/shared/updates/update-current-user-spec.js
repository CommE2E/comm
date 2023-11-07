// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import t from 'tcomb';

import type { UpdateInfoFromRawInfoParams, UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  CurrentUserUpdateInfo,
  CurrentUserRawUpdateInfo,
  CurrentUserUpdateData,
} from '../../types/update-types.js';
import {
  type CurrentUserInfo,
  loggedInUserInfoValidator,
} from '../../types/user-types.js';
import { tNumber, tShape } from '../../utils/validation-utils.js';

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
  entitiesToFetch() {
    return {
      currentUser: true,
    };
  },
  updateInfoFromRawInfo(
    info: CurrentUserRawUpdateInfo,
    params: UpdateInfoFromRawInfoParams,
  ) {
    const { currentUserInfoResult } = params.data;
    invariant(currentUserInfoResult, 'should be set');
    return {
      type: updateTypes.UPDATE_CURRENT_USER,
      id: info.id,
      time: info.time,
      currentUserInfo: currentUserInfoResult,
    };
  },
  deleteCondition: new Set([updateTypes.UPDATE_CURRENT_USER]),
  keyForUpdateData(data: CurrentUserUpdateData) {
    return data.userID;
  },
  typesOfReplacedUpdatesForMatchingKey: 'all_types',
  infoValidator: tShape<CurrentUserUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_CURRENT_USER),
    id: t.String,
    time: t.Number,
    currentUserInfo: loggedInUserInfoValidator,
  }),
});
