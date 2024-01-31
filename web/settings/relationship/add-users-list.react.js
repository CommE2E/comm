// @flow

import * as React from 'react';

import { useSortedENSResolvedUsers } from 'lib/hooks/ens-cache.js';
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
import Button from '../../components/button.react.js';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +searchText: string,
  +excludedStatuses?: $ReadOnlySet<UserRelationshipStatus>,
  +pendingUsersToAdd: $ReadOnlyMap<string, GlobalAccountUserInfo>,
  +setPendingUsersToAdd: SetState<$ReadOnlyMap<string, GlobalAccountUserInfo>>,
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

  const [previouslySelectedUsers, setPreviouslySelectedUsers] = React.useState<
    $ReadOnlyMap<string, GlobalAccountUserInfo>,
  >(new Map());

  React.useEffect(() => {
    setPreviouslySelectedUsers(pendingUsersToAdd);

    // We want this effect to run ONLY when searchModeActive changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchModeActive]);

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

  const previouslySelectedUsersList = React.useMemo(
    () => Array.from(previouslySelectedUsers.values()),
    [previouslySelectedUsers],
  );

  const toggleUser = React.useCallback(
    (userID: string) => {
      setPendingUsersToAdd(pendingUsers => {
        const newPendingUsers = new Map(pendingUsers);

        if (newPendingUsers.delete(userID)) {
          return newPendingUsers;
        }

        if (!previouslySelectedUsers.has(userID)) {
          const newPendingUser: GlobalAccountUserInfo = {
            id: userID,
            username: mergedUserInfos[userID].username,
            avatar: mergedUserInfos[userID].avatar,
          };

          newPendingUsers.set(userID, newPendingUser);
        }

        const newPendingUser = previouslySelectedUsers.get(userID);
        if (newPendingUser) {
          newPendingUsers.set(userID, newPendingUser);
        }

        return newPendingUsers;
      });
    },
    [mergedUserInfos, setPendingUsersToAdd, previouslySelectedUsers],
  );

  const sortedUsersWithENSNames = useSortedENSResolvedUsers(filteredUsers);

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

  const sortedPreviouslySelectedUsersWithENSNames = useSortedENSResolvedUsers(
    previouslySelectedUsersList,
  );

  const previouslySelectedUserRows = React.useMemo(() => {
    if (searchModeActive || previouslySelectedUsers.size === 0) {
      return null;
    }

    const sortedPreviouslySelectedUserRows =
      sortedPreviouslySelectedUsersWithENSNames.map(userInfo => (
        <AddUsersListItem
          userInfo={userInfo}
          key={userInfo.id}
          onToggleUser={toggleUser}
          userSelected={pendingUsersToAdd.has(userInfo.id)}
        />
      ));

    return (
      <div className={css.previouslySelectedUsersContainer}>
        {sortedPreviouslySelectedUserRows}
      </div>
    );
  }, [
    searchModeActive,
    previouslySelectedUsers.size,
    sortedPreviouslySelectedUsersWithENSNames,
    toggleUser,
    pendingUsersToAdd,
  ]);

  const onClickClearAll = React.useCallback(() => {
    setPendingUsersToAdd(new Map());
  }, [setPendingUsersToAdd]);

  const clearAllButtonColor = React.useMemo(() => {
    if (pendingUsersToAdd.size === 0) {
      return { color: 'var(--link-background-secondary-disabled)' };
    }
    return { color: 'var(--link-background-secondary-default)' };
  }, [pendingUsersToAdd.size]);

  const clearAllButton = React.useMemo(() => {
    if (searchModeActive) {
      return null;
    }

    return (
      <Button
        variant="text"
        buttonColor={clearAllButtonColor}
        onClick={onClickClearAll}
        disabled={pendingUsersToAdd.size === 0}
      >
        Clear all
      </Button>
    );
  }, [
    clearAllButtonColor,
    onClickClearAll,
    pendingUsersToAdd.size,
    searchModeActive,
  ]);

  const listHeader = React.useMemo(() => {
    let selectionText = 'Select users';
    if (searchModeActive) {
      selectionText = 'Search results:';
    } else if (pendingUsersToAdd.size > 0) {
      selectionText = `${pendingUsersToAdd.size} selected`;
    }

    return (
      <div className={css.listHeaderContainer}>
        <div className={css.selectionText}>{selectionText}</div>
        {clearAllButton}
      </div>
    );
  }, [clearAllButton, pendingUsersToAdd.size, searchModeActive]);

  let errors;
  if (errorMessage) {
    errors = <div className={css.error}>{errorMessage}</div>;
  }

  const addUsersList = React.useMemo(
    () => (
      <div className={css.container}>
        {listHeader}
        <div className={css.scrollContainer}>
          {previouslySelectedUserRows}
          {userRows}
        </div>
        {errors}
      </div>
    ),
    [errors, listHeader, userRows, previouslySelectedUserRows],
  );

  return addUsersList;
}

export default AddUsersList;
