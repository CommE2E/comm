// @flow

import * as React from 'react';

import { searchUsers } from 'lib/actions/user-actions.js';
import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors.js';
import type { UserRelationshipStatus } from 'lib/types/relationship-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import { useSelector } from '../../redux/redux-utils.js';
import AddUsersListItem from './add-users-list-item.react.js';
import css from './add-users-list.css';

type Props = {
  +searchText: string,
  +excludedStatuses?: $ReadOnlySet<UserRelationshipStatus>,
};

function AddUsersList(props: Props): React.Node {
  const { searchText, excludedStatuses = new Set() } = props;

  const userStoreSearchIndex = useSelector(userStoreSearchIndexSelector);
  const [userStoreSearchResults, setUserStoreSearchResults] = React.useState<
    $ReadOnlySet<string>,
  >(new Set(userStoreSearchIndex.getSearchResults(searchText)));
  React.useEffect(() => {
    setUserStoreSearchResults(
      new Set(userStoreSearchIndex.getSearchResults(searchText)),
    );
  }, [searchText, userStoreSearchIndex]);

  const [serverSearchResults, setServerSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);
  const callSearchUsers = useServerCall(searchUsers);
  React.useEffect(() => {
    (async () => {
      if (searchText.length === 0) {
        setServerSearchResults([]);
      } else {
        const { userInfos } = await callSearchUsers(searchText);
        setServerSearchResults(userInfos);
      }
    })();
  }, [callSearchUsers, searchText]);

  const searchTextPresent = searchText.length > 0;
  const userInfos = useSelector(state => state.userStore.userInfos);
  const mergedUserInfos = React.useMemo(() => {
    const mergedInfos = {};

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
        .filter(user => !excludedStatuses.has(user.relationshipStatus))
        .sort((user1, user2) => user1.username.localeCompare(user2.username)),
    [excludedStatuses, mergedUserInfos],
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
  const pendingUserIDs = React.useMemo(
    () => new Set(pendingUsersToAdd.map(userInfo => userInfo.id)),
    [pendingUsersToAdd],
  );

  const filteredUsers = React.useMemo(
    () => sortedUsers.filter(userInfo => !pendingUserIDs.has(userInfo.id)),
    [pendingUserIDs, sortedUsers],
  );

  const userRows = React.useMemo(
    () =>
      filteredUsers.map(userInfo => (
        <AddUsersListItem
          userInfo={userInfo}
          key={userInfo.id}
          selectUser={selectUser}
        />
      )),
    [filteredUsers, selectUser],
  );
  return <div className={css.container}>{userRows}</div>;
}

export default AddUsersList;
