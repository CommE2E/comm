// @flow

import * as React from 'react';

import type { AccountUserInfo } from 'lib/types/user-types';

import SearchModal from '../../modals/search-modal.react';
import { UserList, type UserRowProps } from './user-list.react';

type Props = {
  +onClose: () => void,
  +name: string,
  +userRowComponent: React.ComponentType<UserRowProps>,
  +filterUser: (userInfo: AccountUserInfo) => boolean,
  +usersComparator: (user1: AccountUserInfo, user2: AccountUserInfo) => number,
};

function UserListModal(props: Props): React.Node {
  const {
    onClose,
    name,
    userRowComponent,
    filterUser,
    usersComparator,
  } = props;
  const searchModalChildGenerator = React.useCallback(
    (searchText: string) => (
      <UserList
        userRowComponent={userRowComponent}
        filterUser={filterUser}
        usersComparator={usersComparator}
        searchText={searchText}
      />
    ),
    [filterUser, userRowComponent, usersComparator],
  );

  return (
    <SearchModal
      name={name}
      size="large"
      searchPlaceholder="Search by name"
      onClose={onClose}
    >
      {searchModalChildGenerator}
    </SearchModal>
  );
}

export default UserListModal;
