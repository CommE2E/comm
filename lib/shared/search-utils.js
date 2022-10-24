// @flow

import SearchIndex from './search-index.js';
import {
  userIsMember,
  threadMemberHasPermission,
  getContainingThreadID,
} from './thread-utils.js';
import genesis from '../facts/genesis.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import {
  type ThreadInfo,
  type ThreadType,
  threadTypes,
  threadPermissions,
} from '../types/thread-types.js';
import type { AccountUserInfo, UserListItem } from '../types/user-types.js';

const notFriendNotice = 'not friend';

function getPotentialMemberItems(
  text: string,
  userInfos: { +[id: string]: AccountUserInfo },
  inputSearchIndex: SearchIndex | $ReadOnlyArray<SearchIndex>,
  excludeUserIDs: $ReadOnlyArray<string>,
  inputParentThreadInfo: ?ThreadInfo,
  inputCommunityThreadInfo: ?ThreadInfo,
  threadType: ?ThreadType,
): UserListItem[] {
  const searchIndexes = Array.isArray(inputSearchIndex)
    ? inputSearchIndex
    : [inputSearchIndex];

  const communityThreadInfo =
    inputCommunityThreadInfo && inputCommunityThreadInfo.id !== genesis.id
      ? inputCommunityThreadInfo
      : null;
  const parentThreadInfo =
    inputParentThreadInfo && inputParentThreadInfo.id !== genesis.id
      ? inputParentThreadInfo
      : null;

  const containgThreadID = threadType
    ? getContainingThreadID(parentThreadInfo, threadType)
    : null;

  let containingThreadInfo = null;
  if (containgThreadID === parentThreadInfo?.id) {
    containingThreadInfo = parentThreadInfo;
  } else if (containgThreadID === communityThreadInfo?.id) {
    containingThreadInfo = communityThreadInfo;
  }

  let results = [];
  const appendUserInfo = (userInfo: AccountUserInfo) => {
    const { id } = userInfo;
    if (excludeUserIDs.includes(id)) {
      return;
    }
    if (results.some(item => item.id === id)) {
      return;
    }
    if (
      communityThreadInfo &&
      !threadMemberHasPermission(
        communityThreadInfo,
        id,
        threadPermissions.KNOW_OF,
      )
    ) {
      return;
    }
    results.push({
      ...userInfo,
      isMemberOfParentThread: userIsMember(parentThreadInfo, id),
      isMemberOfContainingThread: userIsMember(containingThreadInfo, id),
    });
  };
  if (text === '') {
    for (const id in userInfos) {
      appendUserInfo(userInfos[id]);
    }
  } else {
    for (const searchIndex of searchIndexes) {
      const ids = searchIndex.getSearchResults(text);
      for (const id of ids) {
        appendUserInfo(userInfos[id]);
      }
    }
  }

  const blockedRelationshipsStatuses = new Set([
    userRelationshipStatus.BLOCKED_BY_VIEWER,
    userRelationshipStatus.BLOCKED_VIEWER,
    userRelationshipStatus.BOTH_BLOCKED,
  ]);

  if (text === '') {
    results = results.filter(userInfo =>
      containingThreadInfo
        ? userInfo.isMemberOfContainingThread &&
          !blockedRelationshipsStatuses.has(userInfo.relationshipStatus)
        : userInfo.relationshipStatus === userRelationshipStatus.FRIEND,
    );
  }

  const nonFriends = [];
  const blockedUsers = [];
  const friends = [];
  const containingThreadMembers = [];
  const parentThreadMembers = [];

  for (const userResult of results) {
    const relationshipStatus = userResult.relationshipStatus;
    if (blockedRelationshipsStatuses.has(relationshipStatus)) {
      blockedUsers.push(userResult);
    } else if (userResult.isMemberOfParentThread) {
      parentThreadMembers.push(userResult);
    } else if (userResult.isMemberOfContainingThread) {
      containingThreadMembers.push(userResult);
    } else if (relationshipStatus === userRelationshipStatus.FRIEND) {
      friends.push(userResult);
    } else {
      nonFriends.push(userResult);
    }
  }

  const sortedResults = parentThreadMembers
    .concat(containingThreadMembers)
    .concat(friends)
    .concat(nonFriends)
    .concat(blockedUsers);

  return sortedResults.map(
    ({
      isMemberOfContainingThread,
      isMemberOfParentThread,
      relationshipStatus,
      ...result
    }) => {
      let notice, alertText, alertTitle;
      const username = result.username;
      if (blockedRelationshipsStatuses.has(relationshipStatus)) {
        notice = 'user is blocked';
        alertTitle = 'User is blocked';
        alertText =
          `Before you add ${username} to this chat, ` +
          'you’ll need to unblock them. You can do this from the Block List ' +
          'in the Profile tab.';
      } else if (!isMemberOfContainingThread && containingThreadInfo) {
        if (threadType !== threadTypes.SIDEBAR) {
          notice = 'not in community';
          alertTitle = 'Not in community';
          alertText = 'You can only add members of the community to this chat';
        } else {
          notice = 'not in parent chat';
          alertTitle = 'Not in parent chat';
          alertText = 'You can only add members of the parent chat to a thread';
        }
      } else if (
        !containingThreadInfo &&
        relationshipStatus !== userRelationshipStatus.FRIEND
      ) {
        notice = notFriendNotice;
        alertTitle = 'Not a friend';
        alertText =
          `Before you add ${username} to this chat, ` +
          'you’ll need to send them a friend request. ' +
          'You can do this from the Friend List in the Profile tab.';
      } else if (parentThreadInfo && !isMemberOfParentThread) {
        notice = 'not in parent chat';
      }
      if (notice) {
        result = { ...result, notice };
      }
      if (alertTitle) {
        result = { ...result, alertTitle, alertText };
      }
      return result;
    },
  );
}

export { getPotentialMemberItems, notFriendNotice };
