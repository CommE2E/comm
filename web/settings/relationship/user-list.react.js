// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useResolvableNames } from 'lib/hooks/ens-cache.js';
import { useUserSearchIndex } from 'lib/selectors/nav-selectors.js';
import type { AccountUserInfo, UserInfo } from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';

import css from './user-list.css';
import { useSelector } from '../../redux/redux-utils.js';

export type UserRowProps = {
  +userInfo: AccountUserInfo,
  +onMenuVisibilityChange?: (visible: boolean) => void,
};

type UserListProps = {
  +userRowComponent: React.ComponentType<UserRowProps>,
  +filterUser: (userInfo: UserInfo) => boolean,
  +usersComparator: (user1: AccountUserInfo, user2: AccountUserInfo) => number,
  +searchText: string,
};

export function UserList(props: UserListProps): React.Node {
  const { userRowComponent, filterUser, usersComparator, searchText } = props;
  const userInfos = useSelector(state => state.userStore.userInfos);
  const userInfosArray = React.useMemo(
    () => values(userInfos).filter(filterUser),
    [userInfos, filterUser],
  );
  const userStoreSearchIndex = useUserSearchIndex(userInfosArray);
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);

  const onMenuVisibilityChange = React.useCallback(
    (visible: boolean) => setIsMenuVisible(visible),
    [],
  );

  const searchResult = React.useMemo(
    () => userStoreSearchIndex.getSearchResults(searchText),
    [searchText, userStoreSearchIndex],
  );

  const users = React.useMemo(() => {
    const userIDs = searchText ? searchResult : userInfosArray.map(u => u.id);
    const matchedUserInfos = [];
    for (const id of userIDs) {
      const { username, relationshipStatus } = userInfos[id];
      if (!username) {
        continue;
      }
      matchedUserInfos.push({
        id,
        username,
        relationshipStatus,
      });
    }
    return matchedUserInfos.sort(usersComparator);
  }, [userInfosArray, searchResult, searchText, userInfos, usersComparator]);
  const usersWithENSNames = useResolvableNames<AccountUserInfo>(users);

  const userRows = React.useMemo(() => {
    const UserRow = userRowComponent;
    return usersWithENSNames.map(user => (
      <UserRow
        userInfo={user}
        key={user.id}
        onMenuVisibilityChange={onMenuVisibilityChange}
      />
    ));
  }, [usersWithENSNames, userRowComponent, onMenuVisibilityChange]);

  const noResultsMessage = React.useMemo(() => {
    if (searchText.length === 0 || usersWithENSNames.length > 0) {
      return null;
    }

    return <div className={css.emptyList}>No results</div>;
  }, [searchText.length, usersWithENSNames.length]);

  const containerClasses = classNames(css.userListContainer, {
    [css.noScroll]: isMenuVisible,
  });

  return (
    <div className={containerClasses}>
      {userRows}
      {noResultsMessage}
    </div>
  );
}
