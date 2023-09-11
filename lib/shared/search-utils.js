// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import SearchIndex from './search-index.js';
import {
  userIsMember,
  threadMemberHasPermission,
  getContainingThreadID,
} from './thread-utils.js';
import {
  searchMessages,
  searchMessagesActionTypes,
} from '../actions/message-actions.js';
import {
  searchUsers,
  searchUsersActionTypes,
} from '../actions/user-actions.js';
import genesis from '../facts/genesis.js';
import type {
  ChatMessageInfoItem,
  MessageListData,
} from '../selectors/chat-selectors';
import type { MessageInfo, RawMessageInfo } from '../types/message-types';
import { userRelationshipStatus } from '../types/relationship-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { type ThreadType, threadTypes } from '../types/thread-types-enum.js';
import { type ThreadInfo } from '../types/thread-types.js';
import type {
  AccountUserInfo,
  UserListItem,
  GlobalAccountUserInfo,
} from '../types/user-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from '../utils/action-utils.js';
import { values } from '../utils/objects.js';

const notFriendNotice = 'not friend';

function getPotentialMemberItems({
  text,
  userInfos,
  searchIndex,
  excludeUserIDs,
  includeServerSearchUsers,
  inputParentThreadInfo,
  inputCommunityThreadInfo,
  threadType,
}: {
  +text: string,
  +userInfos: { +[id: string]: AccountUserInfo },
  +searchIndex: SearchIndex,
  +excludeUserIDs: $ReadOnlyArray<string>,
  +includeServerSearchUsers?: $ReadOnlyArray<GlobalAccountUserInfo>,
  +inputParentThreadInfo?: ?ThreadInfo,
  +inputCommunityThreadInfo?: ?ThreadInfo,
  +threadType?: ?ThreadType,
}): UserListItem[] {
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

  const results: {
    [id: string]: {
      ...AccountUserInfo | GlobalAccountUserInfo,
      isMemberOfParentThread: boolean,
      isMemberOfContainingThread: boolean,
    },
  } = {};
  const appendUserInfo = (
    userInfo: AccountUserInfo | GlobalAccountUserInfo,
  ) => {
    const { id } = userInfo;
    if (excludeUserIDs.includes(id) || id in results) {
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
    results[id] = {
      ...userInfo,
      isMemberOfParentThread: userIsMember(parentThreadInfo, id),
      isMemberOfContainingThread: userIsMember(containingThreadInfo, id),
    };
  };
  if (text === '') {
    for (const id in userInfos) {
      appendUserInfo(userInfos[id]);
    }
  } else {
    const ids = searchIndex.getSearchResults(text);
    for (const id of ids) {
      appendUserInfo(userInfos[id]);
    }
  }

  if (includeServerSearchUsers) {
    for (const userInfo of includeServerSearchUsers) {
      appendUserInfo(userInfo);
    }
  }

  const blockedRelationshipsStatuses = new Set([
    userRelationshipStatus.BLOCKED_BY_VIEWER,
    userRelationshipStatus.BLOCKED_VIEWER,
    userRelationshipStatus.BOTH_BLOCKED,
  ]);

  let userResults = values(results);
  if (text === '') {
    userResults = userResults.filter(userInfo =>
      containingThreadInfo
        ? userInfo.isMemberOfContainingThread &&
          !blockedRelationshipsStatuses.has(userInfo.relationshipStatus)
        : userInfo?.relationshipStatus === userRelationshipStatus.FRIEND,
    );
  }

  const nonFriends = [];
  const blockedUsers = [];
  const friends = [];
  const containingThreadMembers = [];
  const parentThreadMembers = [];

  for (const userResult of userResults) {
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
      let notice, alert;
      const username = result.username;
      if (blockedRelationshipsStatuses.has(relationshipStatus)) {
        notice = 'user is blocked';
        alert = {
          title: 'User is blocked',
          text:
            `Before you add ${username} to this chat, ` +
            'you’ll need to unblock them. You can do this from the Block List ' +
            'in the Profile tab.',
        };
      } else if (!isMemberOfContainingThread && containingThreadInfo) {
        if (threadType !== threadTypes.SIDEBAR) {
          notice = 'not in community';
          alert = {
            title: 'Not in community',
            text: 'You can only add members of the community to this chat',
          };
        } else {
          notice = 'not in parent chat';
          alert = {
            title: 'Not in parent chat',
            text: 'You can only add members of the parent chat to a thread',
          };
        }
      } else if (
        !containingThreadInfo &&
        relationshipStatus !== userRelationshipStatus.FRIEND
      ) {
        notice = notFriendNotice;
        alert = {
          title: 'Not a friend',
          text:
            `Before you add ${username} to this chat, ` +
            'you’ll need to send them a friend request. ' +
            'You can do this from the Friend List in the Profile tab.',
        };
      } else if (parentThreadInfo && !isMemberOfParentThread) {
        notice = 'not in parent chat';
      }
      if (notice) {
        result = { ...result, notice };
      }
      if (alert) {
        result = { ...result, alert };
      }
      return result;
    },
  );
}

function useSearchMessages(): (
  query: string,
  threadID: string,
  onResultsReceived: (
    messages: $ReadOnlyArray<RawMessageInfo>,
    endReached: boolean,
    queryID: number,
    threadID: string,
  ) => mixed,
  queryID: number,
  cursor?: string,
) => void {
  const callSearchMessages = useServerCall(searchMessages);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    (query, threadID, onResultsReceived, queryID, cursor) => {
      const searchMessagesPromise = (async () => {
        if (query === '') {
          onResultsReceived([], true, queryID, threadID);
          return;
        }
        const { messages, endReached } = await callSearchMessages({
          query,
          threadID,
          cursor,
        });
        onResultsReceived(messages, endReached, queryID, threadID);
      })();

      dispatchActionPromise(searchMessagesActionTypes, searchMessagesPromise);
    },
    [callSearchMessages, dispatchActionPromise],
  );
}

function useSearchUsers(
  usernameInputText: string,
): $ReadOnlyArray<GlobalAccountUserInfo> {
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const [serverSearchResults, setServerSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);
  const callSearchUsers = useServerCall(searchUsers);
  const dispatchActionPromise = useDispatchActionPromise();
  React.useEffect(() => {
    const searchUsersPromise = (async () => {
      if (usernameInputText.length === 0) {
        setServerSearchResults([]);
      } else {
        try {
          const { userInfos } = await callSearchUsers(usernameInputText);
          setServerSearchResults(
            userInfos.filter(({ id }) => id !== currentUserID),
          );
        } catch (err) {
          setServerSearchResults([]);
        }
      }
    })();
    dispatchActionPromise(searchUsersActionTypes, searchUsersPromise);
  }, [
    callSearchUsers,
    currentUserID,
    dispatchActionPromise,
    usernameInputText,
  ]);

  return serverSearchResults;
}

function filterChatMessageInfosForSearch(
  chatMessageInfos: MessageListData,
  translatedSearchResults: $ReadOnlyArray<MessageInfo>,
): ?(ChatMessageInfoItem[]) {
  if (!chatMessageInfos) {
    return null;
  }

  const idSet = new Set(translatedSearchResults.map(item => item.id));

  const chatMessageInfoItems = chatMessageInfos.filter(
    item =>
      item.messageInfo &&
      idSet.has(item.messageInfo.id) &&
      item.messageInfoType === 'composable',
  );

  const uniqueChatMessageInfoItemsMap = new Map();
  chatMessageInfoItems.forEach(
    item =>
      item.messageInfo &&
      item.messageInfo.id &&
      uniqueChatMessageInfoItemsMap.set(item.messageInfo.id, item),
  );

  const sortedChatMessageInfoItems = [];
  for (let i = 0; i < translatedSearchResults.length; i++) {
    sortedChatMessageInfoItems.push(
      uniqueChatMessageInfoItemsMap.get(translatedSearchResults[i].id),
    );
  }

  return sortedChatMessageInfoItems.filter(Boolean);
}

export {
  getPotentialMemberItems,
  notFriendNotice,
  useSearchMessages,
  useSearchUsers,
  filterChatMessageInfosForSearch,
};
