// @flow

import type { BaseAppState } from '../types/redux-types';
import type { UserInfo } from '../types/user-types';
import {
  userRelationshipStatus,
  type UserRelationships,
} from '../types/relationship-types';

import { createSelector } from 'reselect';

const userRelationshipsSelector: (
  state: BaseAppState<*>,
) => UserRelationships = createSelector(
  (state: BaseAppState<*>) => state.userStore.userInfos,
  (userInfos: { [id: string]: UserInfo }) => {
    const friends = [];
    const blocked = [];
    for (const userID in userInfos) {
      const userInfo = userInfos[userID];
      const { relationshipStatus } = userInfo;
      if (
        relationshipStatus === userRelationshipStatus.FRIEND ||
        relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED ||
        relationshipStatus === userRelationshipStatus.REQUEST_SENT
      ) {
        friends.push(userInfo);
      }
      if (
        relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
        relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
      ) {
        blocked.push(userInfo);
      }
    }

    return { friends, blocked };
  },
);

export { userRelationshipsSelector };
