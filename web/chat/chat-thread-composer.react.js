// @flow
import classNames from 'classnames';
import _cloneDeep from 'lodash/fp/cloneDeep.js';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { searchUsers } from 'lib/actions/user-actions.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import {
  filterPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { SetState } from 'lib/types/hook-types.js';
import type {
  AccountUserInfo,
  UserListItem,
  GlobalAccountUserInfo,
} from 'lib/types/user-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import Button from '../components/button.react.js';
import Label from '../components/label.react.js';
import Search from '../components/search.react.js';
import type { InputState } from '../input/input-state.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import css from './chat-thread-composer.css';

type Props = {
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +setUserInfoInputArray: SetState<$ReadOnlyArray<AccountUserInfo>>,
  +otherUserInfos: { [id: string]: AccountUserInfo },
  +threadID: string,
  +inputState: InputState,
};

type ActiveThreadBehavior =
  | 'reset-active-thread-if-pending'
  | 'keep-active-thread';

function ChatThreadComposer(props: Props): React.Node {
  const {
    userInfoInputArray,
    setUserInfoInputArray,
    otherUserInfos,
    threadID,
    inputState,
  } = props;

  const [usernameInputText, setUsernameInputText] = React.useState('');

  const userInfos = useSelector(state => state.userStore.userInfos);
  const viewerID = useSelector(state => state.currentUserInfo?.id);

  const [serverSearchUserInfos, setServerSearchUserInfos] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);
  const callSearchUsers = useServerCall(searchUsers);
  React.useEffect(() => {
    (async () => {
      if (usernameInputText.length === 0) {
        setServerSearchUserInfos([]);
      } else {
        const { userInfos: serverUserInfos } = await callSearchUsers(
          usernameInputText,
        );
        setServerSearchUserInfos(serverUserInfos);
      }
    })();
  }, [callSearchUsers, usernameInputText]);

  const filteredServerUserInfos = React.useMemo(() => {
    const result = {};
    for (const user of serverSearchUserInfos) {
      if (!(user.id in userInfos)) {
        result[user.id] = user;
      }
    }
    return filterPotentialMembers(result, viewerID);
  }, [serverSearchUserInfos, userInfos, viewerID]);

  const mergedUserInfos = React.useMemo(
    () => ({ ...filteredServerUserInfos, ...otherUserInfos }),
    [filteredServerUserInfos, otherUserInfos],
  );

  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);
  const mergedUserSearchIndex = React.useMemo(() => {
    const searchIndex = _cloneDeep(userSearchIndex);
    for (const id in filteredServerUserInfos) {
      searchIndex.addEntry(id, filteredServerUserInfos[id].username);
    }
    return searchIndex;
  }, [filteredServerUserInfos, userSearchIndex]);

  const userInfoInputIDs = React.useMemo(
    () => userInfoInputArray.map(userInfo => userInfo.id),
    [userInfoInputArray],
  );

  const userListItems = React.useMemo(
    () =>
      getPotentialMemberItems(
        usernameInputText,
        mergedUserInfos,
        mergedUserSearchIndex,
        userInfoInputIDs,
      ),
    [
      usernameInputText,
      mergedUserInfos,
      mergedUserSearchIndex,
      userInfoInputIDs,
    ],
  );
  const userListItemsWithENSNames = useENSNames(userListItems);

  const onSelectUserFromSearch = React.useCallback(
    (id: string, username: string) => {
      setUserInfoInputArray(previousUserInfoInputArray => [
        ...previousUserInfoInputArray,
        { id, username },
      ]);
      setUsernameInputText('');
    },
    [setUserInfoInputArray],
  );

  const onRemoveUserFromSelected = React.useCallback(
    (id: string) => {
      setUserInfoInputArray(previousUserInfoInputArray =>
        previousUserInfoInputArray.filter(user => user.id !== id),
      );
    },
    [setUserInfoInputArray],
  );

  const userSearchResultList = React.useMemo(() => {
    if (
      !userListItemsWithENSNames.length ||
      (!usernameInputText && userInfoInputArray.length)
    ) {
      return null;
    }

    return (
      <ul className={css.searchResultsContainer}>
        {userListItemsWithENSNames.map((userSearchResult: UserListItem) => (
          <li key={userSearchResult.id} className={css.searchResultsItem}>
            <Button
              variant="text"
              onClick={() =>
                onSelectUserFromSearch(
                  userSearchResult.id,
                  userSearchResult.username,
                )
              }
              className={css.searchResultsButton}
            >
              <div className={css.userName}>{userSearchResult.username}</div>
              <div className={css.userInfo}>{userSearchResult.alertTitle}</div>
            </Button>
          </li>
        ))}
      </ul>
    );
  }, [
    onSelectUserFromSearch,
    userInfoInputArray.length,
    userListItemsWithENSNames,
    usernameInputText,
  ]);

  const dispatch = useDispatch();
  const hideSearch = React.useCallback(
    (threadBehavior: ActiveThreadBehavior = 'keep-active-thread') => {
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          chatMode: 'view',
          activeChatThreadID:
            threadBehavior === 'keep-active-thread' ||
            !threadIsPending(threadID)
              ? threadID
              : null,
        },
      });
    },
    [dispatch, threadID],
  );

  const onCloseSearch = React.useCallback(() => {
    hideSearch('reset-active-thread-if-pending');
  }, [hideSearch]);

  const userInfoInputArrayWithENSNames = useENSNames(userInfoInputArray);
  const tagsList = React.useMemo(() => {
    if (!userInfoInputArrayWithENSNames?.length) {
      return null;
    }
    const labels = userInfoInputArrayWithENSNames.map(user => {
      return (
        <Label key={user.id} onClose={() => onRemoveUserFromSelected(user.id)}>
          {user.username}
        </Label>
      );
    });
    return <div className={css.userSelectedTags}>{labels}</div>;
  }, [userInfoInputArrayWithENSNames, onRemoveUserFromSelected]);

  React.useEffect(() => {
    if (!inputState) {
      return;
    }
    inputState.registerSendCallback(hideSearch);
    return () => inputState.unregisterSendCallback(hideSearch);
  }, [hideSearch, inputState]);

  const threadSearchContainerStyles = classNames(css.threadSearchContainer, {
    [css.fullHeight]: !userInfoInputArray.length,
  });

  return (
    <div className={threadSearchContainerStyles}>
      <div className={css.searchRow}>
        <div className={css.searchField}>
          <Search
            onChangeText={setUsernameInputText}
            searchText={usernameInputText}
            placeholder="Select users for chat"
          />
        </div>
        <Button className={css.closeSearch} onClick={onCloseSearch}>
          <SWMansionIcon size={25} icon="cross" />
        </Button>
      </div>
      {tagsList}
      {userSearchResultList}
    </div>
  );
}

export default ChatThreadComposer;
