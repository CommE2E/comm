// @flow

import * as React from 'react';

import { useUserSearchIndex } from 'lib/selectors/nav-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import {
  useSearchUsers,
  usePotentialMemberItems,
} from 'lib/shared/search-utils.js';
import { threadActualMembers } from 'lib/shared/thread-utils.js';
import type { UserRelationshipStatus } from 'lib/types/relationship-types.js';
import type {
  GlobalAccountUserInfo,
  AccountUserInfo,
  UserListItem,
} from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';

import { useAddUsersListContext } from './add-users-list-provider.react.js';
import { useSortedENSResolvedUsers } from './user-list-hooks.js';
import { useSelector } from '../../redux/redux-utils.js';

type UseUserRelationshipUserInfosParams = {
  +searchText: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
};

function useUserRelationshipUserInfos(
  params: UseUserRelationshipUserInfosParams,
): {
  +mergedUserInfos: {
    [string]: GlobalAccountUserInfo | AccountUserInfo,
  },
  +sortedUsersWithENSNames: $ReadOnlyArray<
    GlobalAccountUserInfo | AccountUserInfo,
  >,
} {
  const { searchText, excludedStatuses } = params;

  const { previouslySelectedUsers } = useAddUsersListContext();

  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const userInfos = useSelector(state => state.userStore.userInfos);
  const userInfosArray = React.useMemo(() => values(userInfos), [userInfos]);

  const userStoreSearchIndex = useUserSearchIndex(userInfosArray);
  const [userStoreSearchResults, setUserStoreSearchResults] = React.useState<
    $ReadOnlySet<string>,
  >(new Set(userStoreSearchIndex.getSearchResults(searchText)));
  React.useEffect(() => {
    setUserStoreSearchResults(
      new Set(userStoreSearchIndex.getSearchResults(searchText)),
    );
  }, [searchText, userStoreSearchIndex]);

  const serverSearchResults = useSearchUsers(searchText);

  const searchModeActive = searchText.length > 0;

  const mergedUserInfos = React.useMemo(() => {
    const mergedInfos: { [string]: GlobalAccountUserInfo | AccountUserInfo } =
      {};

    for (const userInfo of serverSearchResults) {
      mergedInfos[userInfo.id] = userInfo;
    }

    const userStoreUserIDs = searchModeActive
      ? userStoreSearchResults
      : Object.keys(userInfos);
    for (const id of userStoreUserIDs) {
      const { username, relationshipStatus } = userInfos[id];
      if (username) {
        mergedInfos[id] = { id, username, relationshipStatus };
      }
    }

    return mergedInfos;
  }, [
    searchModeActive,
    serverSearchResults,
    userInfos,
    userStoreSearchResults,
  ]);

  const filteredUsers = React.useMemo(
    () =>
      Object.keys(mergedUserInfos)
        .map(userID => mergedUserInfos[userID])
        .filter(
          user =>
            user.id !== viewerID &&
            (!user.relationshipStatus ||
              !excludedStatuses.has(user.relationshipStatus)) &&
            !previouslySelectedUsers.has(user.id),
        ),
    [excludedStatuses, mergedUserInfos, viewerID, previouslySelectedUsers],
  );

  const sortedUsersWithENSNames = useSortedENSResolvedUsers(filteredUsers);

  return {
    mergedUserInfos,
    sortedUsersWithENSNames,
  };
}

type UseAddMembersListUserInfosParams = {
  +threadID: string,
  +searchText: string,
};

function useAddMembersListUserInfos(params: UseAddMembersListUserInfosParams): {
  +userInfos: {
    [string]: UserListItem,
  },
  +sortedUsersWithENSNames: $ReadOnlyArray<UserListItem>,
} {
  const { threadID, searchText } = params;

  const { previouslySelectedUsers } = useAddUsersListContext();

  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { parentThreadID, community } = threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const excludeUserIDs = React.useMemo(
    () =>
      threadActualMembers(threadInfo.members).concat(
        Array.from(previouslySelectedUsers.keys()),
      ),
    [previouslySelectedUsers, threadInfo.members],
  );

  const userSearchResults = usePotentialMemberItems({
    text: searchText,
    userInfos: otherUserInfos,
    excludeUserIDs,
    inputParentThreadInfo: parentThreadInfo,
    inputCommunityThreadInfo: communityThreadInfo,
    threadType: threadInfo.type,
  });

  const userInfos = React.useMemo(() => {
    const mergedInfos: { [string]: UserListItem } = {};

    for (const userInfo of userSearchResults) {
      mergedInfos[userInfo.id] = userInfo;
    }

    return mergedInfos;
  }, [userSearchResults]);

  const usersAvailableToAdd = React.useMemo(
    () => userSearchResults.filter(user => !user.alert),
    [userSearchResults],
  );

  const sortedUsersWithENSNames =
    useSortedENSResolvedUsers(usersAvailableToAdd);

  return { userInfos, sortedUsersWithENSNames };
}

export { useUserRelationshipUserInfos, useAddMembersListUserInfos };
