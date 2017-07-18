// @flow

import type { BaseAppState } from '../types/redux-types';
import type { UserInfo } from '../types/user-types';

import { createSelector } from 'reselect';

// other than the logged-in user
const otherUserInfos = createSelector(
  (state: BaseAppState) => state.userInfos,
  (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
  (
    userInfos: {[id: string]: UserInfo},
    userID: ?string,
  ): $ReadOnlyArray<UserInfo> => {
    const userInfoArray = [];
    for (let id in userInfos) {
      userInfoArray.push(userInfos[id]);
    }
    return userInfoArray.filter((userInfo: UserInfo) => userInfo.id !== userID);
  },
);

export {
  otherUserInfos,
};
