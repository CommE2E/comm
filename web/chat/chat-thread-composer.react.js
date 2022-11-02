// @flow
import classNames from 'classnames';
import _cloneDeep from 'lodash/fp/cloneDeep';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { searchUsers } from 'lib/actions/user-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import {
  filterPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors';
import {
  getPotentialMemberItems,
  notFriendNotice,
} from 'lib/shared/search-utils';
import { threadIsPending } from 'lib/shared/thread-utils';
import type { ExistingThreadInfoFinder } from 'lib/shared/thread-utils';
import type { SetState } from 'lib/types/hook-types';
import type {
  AccountUserInfo,
  UserListItem,
  GlobalAccountUserInfo,
} from 'lib/types/user-types';
import { useServerCall } from 'lib/utils/action-utils';

import Button from '../components/button.react';
import Label from '../components/label.react';
import Search from '../components/search.react';
import type { InputState } from '../input/input-state';
import Alert from '../modals/alert.react';
import { updateNavInfoActionType } from '../redux/action-types';
import { useSelector } from '../redux/redux-utils';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-thread-composer.css';

type Props = {
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +setUserInfoInputArray: SetState<$ReadOnlyArray<AccountUserInfo>>,
  +existingThreadInfoFinderForCreatingThread: ExistingThreadInfoFinder,
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
    existingThreadInfoFinderForCreatingThread,
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

  const dispatch = useDispatch();
  const { pushModal } = useModalContext();
  const onSelectUserFromSearch = React.useCallback(
    (userItem: UserListItem) => {
      setUsernameInputText('');
      if (!userItem.alert) {
        setUserInfoInputArray(previousUserInfoInputArray => [
          ...previousUserInfoInputArray,
          { id: userItem.id, username: userItem.username },
        ]);
      } else if (
        userItem.notice === notFriendNotice &&
        userInfoInputArray.length === 0
      ) {
        const newUserInfoInputArray = [
          { id: userItem.id, username: userItem.username },
        ];
        setUserInfoInputArray(newUserInfoInputArray);
        const threadInfo = existingThreadInfoFinderForCreatingThread({
          searching: true,
          userInfoInputArray: newUserInfoInputArray,
        });
        dispatch({
          type: updateNavInfoActionType,
          payload: {
            chatMode: 'view',
            activeChatThreadID: threadInfo?.id,
            pendingThread: threadInfo,
          },
        });
      } else {
        pushModal(
          <Alert title={userItem.alert?.title}>{userItem.alert?.text}</Alert>,
        );
      }
      if (!userItem.alert) {
        setUserInfoInputArray(previousUserInfoInputArray => [
          ...previousUserInfoInputArray,
          { id: userItem.id, username: userItem.username },
        ]);
      } else if (
        userItem.notice === notFriendNotice &&
        userInfoInputArray.length === 0
      ) {
        const newUserInfoInputArray = [
          { id: userItem.id, username: userItem.username },
        ];
        setUserInfoInputArray(newUserInfoInputArray);
        const threadInfo = existingThreadInfoFinderForCreatingThread({
          searching: true,
          userInfoInputArray: newUserInfoInputArray,
        });
        dispatch({
          type: updateNavInfoActionType,
          payload: {
            chatMode: 'view',
            activeChatThreadID: threadInfo?.id,
            pendingThread: threadInfo,
          },
        });
      } else {
        pushModal(
          <Alert title={userItem.alert.title}>{userItem.alert.text}</Alert>,
        );
      }
    },
    [
      dispatch,
      existingThreadInfoFinderForCreatingThread,
      pushModal,
      setUserInfoInputArray,
      userInfoInputArray.length,
    ],
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
      !userListItems.length ||
      (!usernameInputText && userInfoInputArray.length)
    ) {
      return null;
    }

    return (
      <ul className={css.searchResultsContainer}>
        {userListItems.map((userSearchResult: UserListItem) => (
          <li key={userSearchResult.id} className={css.searchResultsItem}>
            <Button
              variant="text"
              onClick={() => onSelectUserFromSearch(userSearchResult)}
              className={css.searchResultsButton}
            >
              <div className={css.userName}>{userSearchResult.username}</div>
              <div className={css.userInfo}>{userSearchResult.notice}</div>
            </Button>
          </li>
        ))}
      </ul>
    );
  }, [
    onSelectUserFromSearch,
    userInfoInputArray.length,
    userListItems,
    usernameInputText,
  ]);

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

  const tagsList = React.useMemo(() => {
    if (!userInfoInputArray?.length) {
      return null;
    }
    const labels = userInfoInputArray.map(user => {
      return (
        <Label key={user.id} onClose={() => onRemoveUserFromSelected(user.id)}>
          {user.username}
        </Label>
      );
    });
    return <div className={css.userSelectedTags}>{labels}</div>;
  }, [userInfoInputArray, onRemoveUserFromSelected]);

  React.useEffect(() => {
    if (!inputState) {
      return;
    }
    inputState.registerSendCallback(hideSearch);
    return () => inputState.unregisterSendCallback(hideSearch);
  }, [hideSearch, inputState]);

  const threadSearchContainerStyles = React.useMemo(
    () =>
      classNames(css.threadSearchContainer, {
        [css.fullHeight]: !userInfoInputArray.length,
      }),
    [userInfoInputArray.length],
  );

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
