// @flow

import * as React from 'react';

import { messageID } from './message-utils.js';
import SearchIndex from './search-index.js';
import {
  getContainingThreadID,
  threadMemberHasPermission,
  userIsMember,
} from './thread-utils.js';
import {
  searchMessagesActionTypes,
  useSearchMessages as useSearchMessagesAction,
} from '../actions/message-actions.js';
import {
  searchUsers,
  searchUsersActionTypes,
} from '../actions/user-actions.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import genesis from '../facts/genesis.js';
import { useIdentitySearch } from '../identity-search/identity-search-context.js';
import type {
  ChatMessageInfoItem,
  MessageListData,
} from '../selectors/chat-selectors.js';
import { useUserSearchIndex } from '../selectors/nav-selectors.js';
import { relationshipBlockedInEitherDirection } from '../shared/relationship-utils.js';
import type { MessageInfo, RawMessageInfo } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { type ThreadType, threadTypes } from '../types/thread-types-enum.js';
import type {
  AccountUserInfo,
  GlobalAccountUserInfo,
  UserListItem,
} from '../types/user-types.js';
import { useLegacyAshoatKeyserverCall } from '../utils/action-utils.js';
import { isValidENSName } from '../utils/ens-helpers.js';
import { values } from '../utils/objects.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const notFriendNotice = 'not friend';

function appendUserInfo({
  results,
  excludeUserIDs,
  userInfo,
  parentThreadInfo,
  communityThreadInfo,
  containingThreadInfo,
}: {
  +results: {
    [id: string]: {
      ...AccountUserInfo | GlobalAccountUserInfo,
      isMemberOfParentThread: boolean,
      isMemberOfContainingThread: boolean,
    },
  },
  +excludeUserIDs: $ReadOnlyArray<string>,
  +userInfo: AccountUserInfo | GlobalAccountUserInfo,
  +parentThreadInfo: ?ThreadInfo,
  +communityThreadInfo: ?ThreadInfo,
  +containingThreadInfo: ?ThreadInfo,
}) {
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
}

function usePotentialMemberItems({
  text,
  userInfos,
  excludeUserIDs,
  includeServerSearchUsers,
  inputParentThreadInfo,
  inputCommunityThreadInfo,
  threadType,
}: {
  +text: string,
  +userInfos: { +[id: string]: AccountUserInfo },
  +excludeUserIDs: $ReadOnlyArray<string>,
  +includeServerSearchUsers?: $ReadOnlyArray<GlobalAccountUserInfo>,
  +inputParentThreadInfo?: ?ThreadInfo,
  +inputCommunityThreadInfo?: ?ThreadInfo,
  +threadType?: ?ThreadType,
}): UserListItem[] {
  const memoizedUserInfos = React.useMemo(() => values(userInfos), [userInfos]);
  const searchIndex: SearchIndex = useUserSearchIndex(memoizedUserInfos);

  const communityThreadInfo = React.useMemo(
    () =>
      inputCommunityThreadInfo && inputCommunityThreadInfo.id !== genesis.id
        ? inputCommunityThreadInfo
        : null,
    [inputCommunityThreadInfo],
  );
  const parentThreadInfo = React.useMemo(
    () =>
      inputParentThreadInfo && inputParentThreadInfo.id !== genesis.id
        ? inputParentThreadInfo
        : null,
    [inputParentThreadInfo],
  );

  const containgThreadID = threadType
    ? getContainingThreadID(parentThreadInfo, threadType)
    : null;

  const containingThreadInfo = React.useMemo(() => {
    if (containgThreadID === parentThreadInfo?.id) {
      return parentThreadInfo;
    } else if (containgThreadID === communityThreadInfo?.id) {
      return communityThreadInfo;
    }
    return null;
  }, [containgThreadID, communityThreadInfo, parentThreadInfo]);

  const filteredUserResults = React.useMemo(() => {
    const results: {
      [id: string]: {
        ...AccountUserInfo | GlobalAccountUserInfo,
        isMemberOfParentThread: boolean,
        isMemberOfContainingThread: boolean,
      },
    } = {};
    if (text === '') {
      for (const id in userInfos) {
        appendUserInfo({
          results,
          excludeUserIDs,
          userInfo: userInfos[id],
          parentThreadInfo,
          communityThreadInfo,
          containingThreadInfo,
        });
      }
    } else {
      const ids = searchIndex.getSearchResults(text);
      for (const id of ids) {
        appendUserInfo({
          results,
          excludeUserIDs,
          userInfo: userInfos[id],
          parentThreadInfo,
          communityThreadInfo,
          containingThreadInfo,
        });
      }
    }

    if (includeServerSearchUsers) {
      for (const userInfo of includeServerSearchUsers) {
        appendUserInfo({
          results,
          excludeUserIDs,
          userInfo,
          parentThreadInfo,
          communityThreadInfo,
          containingThreadInfo,
        });
      }
    }

    let userResults = values(results);
    if (text === '') {
      userResults = userResults.filter(userInfo => {
        if (!containingThreadInfo) {
          return userInfo.relationshipStatus === userRelationshipStatus.FRIEND;
        }
        if (!userInfo.isMemberOfContainingThread) {
          return false;
        }
        const { relationshipStatus } = userInfo;
        if (!relationshipStatus) {
          return true;
        }
        return !relationshipBlockedInEitherDirection(relationshipStatus);
      });
    }

    return userResults;
  }, [
    text,
    userInfos,
    searchIndex,
    excludeUserIDs,
    includeServerSearchUsers,
    parentThreadInfo,
    containingThreadInfo,
    communityThreadInfo,
  ]);

  const sortedMembers = React.useMemo(() => {
    const nonFriends = [];
    const blockedUsers = [];
    const friends = [];
    const containingThreadMembers = [];
    const parentThreadMembers = [];

    for (const userResult of filteredUserResults) {
      const { relationshipStatus } = userResult;
      if (
        relationshipStatus &&
        relationshipBlockedInEitherDirection(relationshipStatus)
      ) {
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
        if (
          relationshipStatus &&
          relationshipBlockedInEitherDirection(relationshipStatus)
        ) {
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
  }, [containingThreadInfo, filteredUserResults, parentThreadInfo, threadType]);

  return sortedMembers;
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
  cursor?: ?string,
) => void {
  const callSearchMessages = useSearchMessagesAction();
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

      void dispatchActionPromise(
        searchMessagesActionTypes,
        searchMessagesPromise,
      );
    },
    [callSearchMessages, dispatchActionPromise],
  );
}

function useForwardLookupSearchText(originalText: string): string {
  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;
  const lowercaseText = originalText.toLowerCase();

  const [usernameToSearch, setUsernameToSearch] =
    React.useState<string>(lowercaseText);

  React.useEffect(() => {
    void (async () => {
      if (!ensCache || !isValidENSName(lowercaseText)) {
        setUsernameToSearch(lowercaseText);
        return;
      }

      const address = await ensCache.getAddressForName(lowercaseText);
      if (address) {
        setUsernameToSearch(address);
      } else {
        setUsernameToSearch(lowercaseText);
      }
    })();
  }, [ensCache, lowercaseText]);

  return usernameToSearch;
}

const searchIdentityUsersActionTypes = Object.freeze({
  started: 'SEARCH_USERS_STARTED',
  success: 'SEARCH_USERS_SUCCESS',
  failed: 'SEARCH_USERS_FAILED',
});
function useSearchIdentityUsers(
  usernameInputText: string,
): $ReadOnlyArray<GlobalAccountUserInfo> {
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const { sendPrefixQuery } = useIdentitySearch();
  const [searchResults, setSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);

  const forwardLookupSearchText = useForwardLookupSearchText(usernameInputText);

  const dispatchActionPromise = useDispatchActionPromise();
  React.useEffect(() => {
    if (forwardLookupSearchText.length === 0) {
      setSearchResults([]);
      return;
    }

    const searchIdentityUsersPromise = (async () => {
      try {
        const result = await sendPrefixQuery(forwardLookupSearchText);
        const userInfos = result.map(user => ({
          id: user.userID,
          username: user.username,
          avatar: null,
        }));

        setSearchResults(userInfos.filter(({ id }) => id !== currentUserID));
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      }
    })();
    void dispatchActionPromise(
      searchIdentityUsersActionTypes,
      searchIdentityUsersPromise,
    );
  }, [
    currentUserID,
    forwardLookupSearchText,
    dispatchActionPromise,
    sendPrefixQuery,
  ]);

  return searchResults;
}

function useSearchUsers(
  usernameInputText: string,
): $ReadOnlyArray<GlobalAccountUserInfo> {
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const forwardLookupSearchText = useForwardLookupSearchText(usernameInputText);

  const [serverSearchResults, setServerSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);
  const callSearchUsers = useLegacyAshoatKeyserverCall(searchUsers);
  const dispatchActionPromise = useDispatchActionPromise();
  React.useEffect(() => {
    if (forwardLookupSearchText.length === 0) {
      setServerSearchResults([]);
      return;
    }

    const searchUsersPromise = (async () => {
      try {
        const { userInfos } = await callSearchUsers(forwardLookupSearchText);
        setServerSearchResults(
          userInfos.filter(({ id }) => id !== currentUserID),
        );
      } catch (err) {
        setServerSearchResults([]);
      }
    })();
    void dispatchActionPromise(searchUsersActionTypes, searchUsersPromise);
  }, [
    callSearchUsers,
    currentUserID,
    dispatchActionPromise,
    forwardLookupSearchText,
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

  const idSet = new Set(translatedSearchResults.map(messageID));

  const uniqueChatMessageInfoItemsMap = new Map<string, ChatMessageInfoItem>();
  for (const item of chatMessageInfos) {
    if (item.itemType !== 'message' || item.messageInfoType !== 'composable') {
      continue;
    }
    const id = messageID(item.messageInfo);
    if (idSet.has(id)) {
      uniqueChatMessageInfoItemsMap.set(id, item);
    }
  }

  const sortedChatMessageInfoItems: ChatMessageInfoItem[] = [];
  for (let i = 0; i < translatedSearchResults.length; i++) {
    const id = messageID(translatedSearchResults[i]);
    const match = uniqueChatMessageInfoItemsMap.get(id);
    if (match) {
      sortedChatMessageInfoItems.push(match);
    }
  }
  return sortedChatMessageInfoItems;
}

export {
  usePotentialMemberItems,
  notFriendNotice,
  useSearchMessages,
  useSearchUsers,
  useSearchIdentityUsers,
  filterChatMessageInfosForSearch,
  useForwardLookupSearchText,
};
