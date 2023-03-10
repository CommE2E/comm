// @flow

import * as React from 'react';

import {
  updateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions.js';
import { searchUsers } from 'lib/actions/user-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors.js';
import type {
  UserRelationshipStatus,
  RelationshipAction,
} from 'lib/types/relationship-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import AddUsersListItem from './add-users-list-item.react.js';
import css from './add-users-list.css';
import Button from '../../components/button.react.js';
import type { ButtonColor } from '../../components/button.react.js';
import Label from '../../components/label.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useSelector } from '../../redux/redux-utils.js';

const loadingStatusSelector = createLoadingStatusSelector(
  updateRelationshipsActionTypes,
);

type Props = {
  +searchText: string,
  +excludedStatuses?: $ReadOnlySet<UserRelationshipStatus>,
  +closeModal: () => void,
  +confirmButtonContent: React.Node,
  +confirmButtonColor?: ButtonColor,
  +relationshipAction: RelationshipAction,
};

function AddUsersList(props: Props): React.Node {
  const {
    searchText,
    excludedStatuses = new Set(),
    closeModal,
    confirmButtonContent,
    confirmButtonColor,
    relationshipAction,
  } = props;

  const viewerID = useSelector(state => state.currentUserInfo?.id);
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
      const { username, avatar, relationshipStatus } = userInfos[id];
      if (username) {
        mergedInfos[id] = { id, username, avatar, relationshipStatus };
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
            !excludedStatuses.has(user.relationshipStatus),
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
        const avatar = mergedUserInfos[userID]?.avatar;
        if (!username || pendingUsers.some(user => user.id === userID)) {
          return pendingUsers;
        }

        const newPendingUser = {
          id: userID,
          username,
          avatar,
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

  const [errorMessage, setErrorMessage] = React.useState('');
  const callUpdateRelationships = useServerCall(updateRelationships);
  const dispatchActionPromise = useDispatchActionPromise();
  const updateRelationshipsPromiseCreator = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const result = await callUpdateRelationships({
        action: relationshipAction,
        userIDs: Array.from(pendingUserIDs),
      });
      closeModal();
      return result;
    } catch (e) {
      setErrorMessage('unknown error');
      throw e;
    }
  }, [callUpdateRelationships, closeModal, pendingUserIDs, relationshipAction]);
  const confirmSelection = React.useCallback(
    () =>
      dispatchActionPromise(
        updateRelationshipsActionTypes,
        updateRelationshipsPromiseCreator(),
      ),
    [dispatchActionPromise, updateRelationshipsPromiseCreator],
  );
  const loadingStatus = useSelector(loadingStatusSelector);
  let buttonContent = confirmButtonContent;
  if (loadingStatus === 'loading') {
    buttonContent = (
      <>
        <div className={css.hidden}>{confirmButtonContent}</div>
        <LoadingIndicator status="loading" />
      </>
    );
  }

  let errors;
  if (errorMessage) {
    errors = <div className={css.error}>{errorMessage}</div>;
  }

  return (
    <div className={css.container}>
      {userTags}
      <div className={css.userRowsContainer}>{userRows}</div>
      {errors}
      <div className={css.buttons}>
        <Button variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          onClick={confirmSelection}
          disabled={pendingUserIDs.size === 0 || loadingStatus === 'loading'}
          variant="filled"
          buttonColor={confirmButtonColor}
        >
          <div className={css.confirmButtonContainer}>{buttonContent}</div>
        </Button>
      </div>
    </div>
  );
}

export default AddUsersList;
