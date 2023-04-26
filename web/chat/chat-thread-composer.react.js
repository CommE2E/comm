// @flow
import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { userSearchIndexForPotentialMembers } from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { AccountUserInfo, UserListItem } from 'lib/types/user-types.js';

import css from './chat-thread-composer.css';
import Button from '../components/button.react.js';
import Label from '../components/label.react.js';
import Search from '../components/search.react.js';
import UserAvatar from '../components/user-avatar.react.js';
import type { InputState } from '../input/input-state.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +otherUserInfos: { [id: string]: AccountUserInfo },
  +threadID: string,
  +inputState: InputState,
};

type ActiveThreadBehavior =
  | 'reset-active-thread-if-pending'
  | 'keep-active-thread';

function ChatThreadComposer(props: Props): React.Node {
  const { userInfoInputArray, otherUserInfos, threadID, inputState } = props;

  const [usernameInputText, setUsernameInputText] = React.useState('');

  const dispatch = useDispatch();
  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);

  const userInfoInputIDs = React.useMemo(
    () => userInfoInputArray.map(userInfo => userInfo.id),
    [userInfoInputArray],
  );

  const userListItems = React.useMemo(
    () =>
      getPotentialMemberItems(
        usernameInputText,
        otherUserInfos,
        userSearchIndex,
        userInfoInputIDs,
      ),
    [usernameInputText, otherUserInfos, userSearchIndex, userInfoInputIDs],
  );
  const userListItemsWithENSNames = useENSNames(userListItems);

  const onSelectUserFromSearch = React.useCallback(
    (id: string) => {
      const selectedUserIDs = userInfoInputArray.map(user => user.id);
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          selectedUserList: [...selectedUserIDs, id],
        },
      });
      setUsernameInputText('');
    },
    [dispatch, userInfoInputArray],
  );

  const onRemoveUserFromSelected = React.useCallback(
    (id: string) => {
      const selectedUserIDs = userInfoInputArray.map(user => user.id);
      if (!selectedUserIDs.includes(id)) {
        return;
      }
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          selectedUserList: selectedUserIDs.filter(userID => userID !== id),
        },
      });
    },
    [dispatch, userInfoInputArray],
  );

  const usernameStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [],
  );

  const userSearchResultList = React.useMemo(() => {
    if (
      !userListItemsWithENSNames.length ||
      (!usernameInputText && userInfoInputArray.length)
    ) {
      return null;
    }

    const userItems = userListItemsWithENSNames.map(
      (userSearchResult: UserListItem) => (
        <li key={userSearchResult.id} className={css.searchResultsItem}>
          <Button
            variant="text"
            onClick={() => onSelectUserFromSearch(userSearchResult.id)}
            className={css.searchResultsButton}
          >
            <div className={css.userContainer}>
              <UserAvatar size="small" userID={userSearchResult.id} />
              <div className={css.userName} style={usernameStyle}>
                {userSearchResult.username}
              </div>
            </div>
            <div className={css.userInfo}>{userSearchResult.alertTitle}</div>
          </Button>
        </li>
      ),
    );

    return <ul className={css.searchResultsContainer}>{userItems}</ul>;
  }, [
    onSelectUserFromSearch,
    userInfoInputArray.length,
    userListItemsWithENSNames,
    usernameInputText,
    usernameStyle,
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
