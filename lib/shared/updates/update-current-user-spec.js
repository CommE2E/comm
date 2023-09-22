// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import type { UpdateSpec } from './update-spec.js';
import type { CurrentUserUpdateInfo } from '../../types/update-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';

export const updateCurrentUserSpec: UpdateSpec<CurrentUserUpdateInfo> =
  Object.freeze({
    reduceCurrentUser(state: ?CurrentUserInfo, update: CurrentUserUpdateInfo) {
      if (!_isEqual(update.currentUserInfo)(state)) {
        return update.currentUserInfo;
      }
      return state;
    },
  });
