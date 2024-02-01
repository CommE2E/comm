// @flow

import * as React from 'react';

import { useUserSearchIndex } from 'lib/selectors/nav-selectors.js';
import { useSearchUsers } from 'lib/shared/search-utils.js';
import type { UserRelationshipStatus } from 'lib/types/relationship-types.js';
import type {
  GlobalAccountUserInfo,
  AccountUserInfo,
} from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';

import { useSortedENSResolvedUsers } from './user-list-hooks.js';
import { useSelector } from '../../redux/redux-utils.js';

type UseUserRelationshipUserInfosParams = {
  +searchText: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
  +previouslySelectedUsers: $ReadOnlyMap<string, GlobalAccountUserInfo>,
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
  const { searchText, excludedStatuses, previouslySelectedUsers } = params;

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

export { useUserRelationshipUserInfos };
