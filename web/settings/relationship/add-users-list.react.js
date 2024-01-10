// @flow

import * as React from 'react';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import { useUserSearchIndex } from 'lib/selectors/nav-selectors.js';
import { useSearchUsers } from 'lib/shared/search-utils.js';
import type { UserRelationshipStatus } from 'lib/types/relationship-types.js';
import type {
  GlobalAccountUserInfo,
  AccountUserInfo,
} from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';

import AddUsersListItem from './add-users-list-item.react.js';
import css from './add-users-list.css';
import Label from '../../components/label.react.js';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +searchText: string,
  +excludedStatuses?: $ReadOnlySet<UserRelationshipStatus>,
  +errorMessage: string,
};

function AddUsersList(props: Props): React.Node {
  const { searchText, excludedStatuses = new Set(), errorMessage } = props;

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

  const searchTextPresent = searchText.length > 0;
  const mergedUserInfos = React.useMemo(() => {
    const mergedInfos: { [string]: GlobalAccountUserInfo | AccountUserInfo } =
      {};

    for (const userInfo of serverSearchResults) {
      mergedInfos[userInfo.id] = userInfo;
    }

    const userStoreUserIDs = searchTextPresent
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
    searchTextPresent,
    serverSearchResults,
    userInfos,
    userStoreSearchResults,
  ]);

  const sortedUsers = React.useMemo(
    () =>
      Object.keys(mergedUserInfos)
        .map(userID => mergedUserInfos[userID])
        .filter(
          user =>
            user.id !== viewerID &&
            (!user.relationshipStatus ||
              !excludedStatuses.has(user.relationshipStatus)),
        )
        .sort((user1, user2) => user1.username.localeCompare(user2.username)),
    [excludedStatuses, mergedUserInfos, viewerID],
  );

  const [pendingUsersToAdd, setPendingUsersToAdd] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);
  const selectUser = React.useCallback(
    (userID: string) => {
      setPendingUsersToAdd(pendingUsers => {
        const username = mergedUserInfos[userID]?.username;
        if (!username || pendingUsers.some(user => user.id === userID)) {
          return pendingUsers;
        }

        const newPendingUser = {
          id: userID,
          username,
        };
        let targetIndex = 0;
        while (
          targetIndex < pendingUsers.length &&
          newPendingUser.username.localeCompare(
            pendingUsers[targetIndex].username,
          ) > 0
        ) {
          targetIndex++;
        }
        return [
          ...pendingUsers.slice(0, targetIndex),
          newPendingUser,
          ...pendingUsers.slice(targetIndex),
        ];
      });
    },
    [mergedUserInfos],
  );
  const deselectUser = React.useCallback(
    (userID: string) =>
      setPendingUsersToAdd(pendingUsers =>
        pendingUsers.filter(userInfo => userInfo.id !== userID),
      ),
    [],
  );
  const pendingUserIDs = React.useMemo(
    () => new Set(pendingUsersToAdd.map(userInfo => userInfo.id)),
    [pendingUsersToAdd],
  );

  const pendingUsersWithENSNames = useENSNames(pendingUsersToAdd);
  const userTags = React.useMemo(() => {
    if (pendingUsersWithENSNames.length === 0) {
      return null;
    }
    const tags = pendingUsersWithENSNames.map(userInfo => (
      <Label key={userInfo.id} onClose={() => deselectUser(userInfo.id)}>
        {userInfo.username}
      </Label>
    ));
    return <div className={css.userTagsContainer}>{tags}</div>;
  }, [deselectUser, pendingUsersWithENSNames]);

  const filteredUsers = React.useMemo(
    () => sortedUsers.filter(userInfo => !pendingUserIDs.has(userInfo.id)),
    [pendingUserIDs, sortedUsers],
  );
  const filteredUsersWithENSNames = useENSNames(filteredUsers);

  const userRows = React.useMemo(
    () =>
      filteredUsersWithENSNames.map(userInfo => (
        <AddUsersListItem
          userInfo={userInfo}
          key={userInfo.id}
          selectUser={selectUser}
        />
      )),
    [filteredUsersWithENSNames, selectUser],
  );

  let errors;
  if (errorMessage) {
    errors = <div className={css.error}>{errorMessage}</div>;
  }

  return (
    <div className={css.container}>
      {userTags}
      <div className={css.userRowsContainer}>{userRows}</div>
      {errors}
    </div>
  );
}

export default AddUsersList;
