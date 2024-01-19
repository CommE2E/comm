// @flow

import * as React from 'react';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import { useUserSearchIndex } from 'lib/selectors/nav-selectors.js';
import { useSearchUsers } from 'lib/shared/search-utils.js';
import type { SetState } from 'lib/types/hook-types.js';
import type { UserRelationshipStatus } from 'lib/types/relationship-types.js';
import type {
  GlobalAccountUserInfo,
  AccountUserInfo,
} from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';

import AddUsersListItem from './add-users-list-item.react.js';
import css from './add-users-list.css';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +searchText: string,
  +excludedStatuses?: $ReadOnlySet<UserRelationshipStatus>,
  +pendingUsersToAdd: $ReadOnlySet<string>,
  +setPendingUsersToAdd: SetState<$ReadOnlySet<string>>,
  +errorMessage: string,
};

function AddUsersList(props: Props): React.Node {
  const {
    searchText,
    excludedStatuses = new Set(),
    pendingUsersToAdd,
    setPendingUsersToAdd,
    errorMessage,
  } = props;

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

  const toggleUser = React.useCallback(
    (userID: string) => {
      setPendingUsersToAdd(pendingUsers => {
        const newPendingUsers = new Set(pendingUsers);

        if (!newPendingUsers.delete(userID)) {
          newPendingUsers.add(userID);
        }

        return newPendingUsers;
      });
    },
    [setPendingUsersToAdd],
  );

  const sortedUsersWithENSNames = useENSNames(sortedUsers);

  const userRows = React.useMemo(
    () =>
      sortedUsersWithENSNames.map(userInfo => (
        <AddUsersListItem
          userInfo={userInfo}
          key={userInfo.id}
          onToggleUser={toggleUser}
          userSelected={pendingUsersToAdd.has(userInfo.id)}
        />
      )),
    [sortedUsersWithENSNames, toggleUser, pendingUsersToAdd],
  );

  const listHeader = React.useMemo(() => {
    let selectionText = 'Select users';
    if (pendingUsersToAdd.size > 0) {
      selectionText = `${pendingUsersToAdd.size} selected`;
    }

    return (
      <div className={css.listHeaderContainer}>
        <div className={css.selectionText}>{selectionText}</div>
        {/* {TODO: Add clear all button here} */}
      </div>
    );
  }, [pendingUsersToAdd.size]);

  let errors;
  if (errorMessage) {
    errors = <div className={css.error}>{errorMessage}</div>;
  }

  return (
    <div className={css.container}>
      {listHeader}
      <div className={css.userRowsContainer}>{userRows}</div>
      {errors}
    </div>
  );
}

export default AddUsersList;
