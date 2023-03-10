// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';

import css from './user-list.css';
import { useSelector } from '../../redux/redux-utils.js';

export type UserRowProps = {
  +userInfo: AccountUserInfo,
  +onMenuVisibilityChange?: (visible: boolean) => void,
};

type UserListProps = {
  +userRowComponent: React.ComponentType<UserRowProps>,
  +filterUser: (userInfo: AccountUserInfo) => boolean,
  +usersComparator: (user1: AccountUserInfo, user2: AccountUserInfo) => number,
  +searchText: string,
};

export function UserList(props: UserListProps): React.Node {
  const { userRowComponent, filterUser, usersComparator, searchText } = props;
  const userInfos = useSelector(state => state.userStore.userInfos);
  const userStoreSearchIndex = useSelector(userStoreSearchIndexSelector);
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
    const userIDs = searchText ? searchResult : Object.keys(userInfos);
    const unfilteredUserInfos = [];
    for (const id of userIDs) {
      const { username, avatar, relationshipStatus } = userInfos[id];
      if (!username) {
        continue;
      }
      unfilteredUserInfos.push({
        id,
        username,
        avatar,
        relationshipStatus,
      });
    }
    return unfilteredUserInfos.filter(filterUser).sort(usersComparator);
  }, [filterUser, searchResult, searchText, userInfos, usersComparator]);
  const usersWithENSNames = useENSNames<AccountUserInfo>(users);

  const userRows = React.useMemo(() => {
    const UserRow = userRowComponent;
    return usersWithENSNames.map(user => (
      <UserRow
        userInfo={user}
        key={user.id}
        onMenuVisibilityChange={onMenuVisibilityChange}
      />
    ));
  }, [userRowComponent, usersWithENSNames, onMenuVisibilityChange]);

  const containerClasses = classNames(css.container, {
    [css.noScroll]: isMenuVisible,
  });

  return <div className={containerClasses}>{userRows}</div>;
}
