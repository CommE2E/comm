// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { useUsersSupportThickThreads } from 'lib/hooks/user-identities-hooks.js';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import {
  usePotentialMemberItems,
  useSearchUsers,
  notFriendNotice,
} from 'lib/shared/search-utils.js';
import {
  createPendingThread,
  threadIsPending,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { AccountUserInfo, UserListItem } from 'lib/types/user-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './chat-thread-composer.css';
import UserAvatar from '../avatars/user-avatar.react.js';
import Button from '../components/button.react.js';
import Label from '../components/label.react.js';
import Search from '../components/search.react.js';
import type { InputState } from '../input/input-state.js';
import Alert from '../modals/alert.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +threadID: string,
  +inputState: InputState,
};

type ActiveThreadBehavior =
  | 'reset-active-thread-if-pending'
  | 'keep-active-thread';

function ChatThreadComposer(props: Props): React.Node {
  const { userInfoInputArray, threadID, inputState } = props;

  const [usernameInputText, setUsernameInputText] = React.useState('');

  const dispatch = useDispatch();

  const loggedInUserInfo = useLoggedInUserInfo();
  invariant(loggedInUserInfo, 'loggedInUserInfo should be set');
  const viewerID = loggedInUserInfo.id;

  const excludeUserIDs = React.useMemo(
    () => [
      ...userInfoInputArray.map(userInfo => userInfo.id),
      ...(viewerID && userInfoInputArray.length > 0 ? [viewerID] : []),
    ],
    [userInfoInputArray, viewerID],
  );

  const searchResults = useSearchUsers(usernameInputText);

  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userListItems = usePotentialMemberItems({
    text: usernameInputText,
    userInfos: otherUserInfos,
    auxUserInfos,
    excludeUserIDs,
    includeServerSearchUsers: searchResults,
  });

  const userListItemsWithENSNames = useENSNames(userListItems);

  const { pushModal } = useModalContext();

  const pendingPrivateThread = React.useRef(
    createPendingThread({
      viewerID,
      threadType: threadTypes.PRIVATE,
      members: [loggedInUserInfo],
    }),
  );
  const existingThreadInfoFinderForCreatingThread = useExistingThreadInfoFinder(
    pendingPrivateThread.current,
  );

  const checkUsersThickThreadSupport = useUsersSupportThickThreads();

  const onSelectUserFromSearch = React.useCallback(
    async (userListItem: UserListItem) => {
      const { alert, notice, disabled, ...user } = userListItem;
      setUsernameInputText('');
      if (
        (notice === notFriendNotice || user.id === viewerID) &&
        userInfoInputArray.length === 0
      ) {
        const newUserInfo = {
          id: userListItem.id,
          username: userListItem.username,
        };
        const newUserInfoInputArray = user.id === viewerID ? [] : [newUserInfo];
        const usersSupportingThickThreads = await checkUsersThickThreadSupport(
          newUserInfoInputArray.map(userInfo => userInfo.id),
        );
        const threadInfo = existingThreadInfoFinderForCreatingThread({
          searching: true,
          userInfoInputArray: newUserInfoInputArray,
          allUsersSupportThickThreads:
            user.id === viewerID
              ? true
              : !!usersSupportingThickThreads.get(user.id),
        });
        dispatch({
          type: updateNavInfoActionType,
          payload: {
            chatMode: 'view',
            activeChatThreadID: threadInfo?.id,
            pendingThread: threadInfo,
          },
        });
      } else if (!alert) {
        dispatch({
          type: updateNavInfoActionType,
          payload: {
            selectedUserList: [...userInfoInputArray, user],
          },
        });
      } else {
        pushModal(<Alert title={alert.title}>{alert.text}</Alert>);
      }
    },
    [
      checkUsersThickThreadSupport,
      dispatch,
      viewerID,
      existingThreadInfoFinderForCreatingThread,
      pushModal,
      userInfoInputArray,
    ],
  );

  const onRemoveUserFromSelected = React.useCallback(
    (userID: string) => {
      const newSelectedUserList = userInfoInputArray.filter(
        ({ id }) => userID !== id,
      );
      if (_isEqual(userInfoInputArray)(newSelectedUserList)) {
        return;
      }
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          selectedUserList: newSelectedUserList,
        },
      });
    },
    [dispatch, userInfoInputArray],
  );

  const userSearchResultList = React.useMemo(() => {
    if (
      !userListItemsWithENSNames.length ||
      (!usernameInputText && userInfoInputArray.length)
    ) {
      return null;
    }

    const userItems = userListItemsWithENSNames.map(
      (userSearchResult: UserListItem) => {
        return (
          <li key={userSearchResult.id} className={css.searchResultsItem}>
            <Button
              variant="text"
              onClick={() => onSelectUserFromSearch(userSearchResult)}
              className={css.searchResultsButton}
            >
              <div className={css.userContainer}>
                <UserAvatar size="S" userID={userSearchResult.id} />
                <div className={css.userName}>{userSearchResult.username}</div>
              </div>
              <div className={css.userInfo}>{userSearchResult.notice}</div>
            </Button>
          </li>
        );
      },
    );

    return <ul className={css.searchResultsContainer}>{userItems}</ul>;
  }, [
    onSelectUserFromSearch,
    userInfoInputArray.length,
    userListItemsWithENSNames,
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
      return undefined;
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
            autoFocus={true}
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
