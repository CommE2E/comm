// @flow

import type { BaseAppState } from '../types/redux-types';
import type { UserInfo } from '../types/user-types';
import {
  userRelationshipStatus,
  type UserRelationships,
} from '../types/relationship-types';

import { createSelector } from 'reselect';
import _orderBy from 'lodash/fp/orderBy';

const userRelationshipsSelector: (
  state: BaseAppState<*>,
) => UserRelationships = createSelector(
  (state: BaseAppState<*>) => state.userStore.userInfos,
  (userInfos: { [id: string]: UserInfo }) => {
    const unorderedFriendRequests = [];
    const unorderedFriends = [];
    const blocked = [];
    for (const userID in userInfos) {
      const userInfo = userInfos[userID];
      const { relationshipStatus } = userInfo;
      if (
        relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED ||
        relationshipStatus === userRelationshipStatus.REQUEST_SENT
      ) {
        unorderedFriendRequests.push(userInfo);
      } else if (relationshipStatus === userRelationshipStatus.FRIEND) {
        unorderedFriends.push(userInfo);
      } else if (
        relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
        relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
      ) {
        blocked.push(userInfo);
      }
    }
    const friendRequests = _orderBy('relationshipStatus')('desc')(
      unorderedFriendRequests,
    );
    const friends = friendRequests.concat(unorderedFriends);

    return { friends, blocked };
  },
);

export { userRelationshipsSelector };
