// @flow

import _orderBy from 'lodash/fp/orderBy.js';
import { createSelector } from 'reselect';

import type { BaseAppState } from '../types/redux-types.js';
import {
  userRelationshipStatus,
  type UserRelationships,
} from '../types/relationship-types.js';
import type { UserInfos } from '../types/user-types.js';

const userRelationshipsSelector: (state: BaseAppState<*>) => UserRelationships =
  createSelector(
    (state: BaseAppState<*>) => state.userStore.userInfos,
    (userInfos: UserInfos) => {
      const unorderedFriendRequests = [];
      const unorderedFriends = [];
      const blocked = [];
      for (const userID in userInfos) {
        const userInfo = userInfos[userID];
        const { id, username, relationshipStatus } = userInfo;
        if (!username) {
          continue;
        }
        if (
          relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED ||
          relationshipStatus === userRelationshipStatus.REQUEST_SENT
        ) {
          unorderedFriendRequests.push({ id, username, relationshipStatus });
        } else if (relationshipStatus === userRelationshipStatus.FRIEND) {
          unorderedFriends.push({ id, username, relationshipStatus });
        } else if (
          relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
          relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
        ) {
          blocked.push({ id, username, relationshipStatus });
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
