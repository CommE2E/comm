// @flow

import * as React from 'react';

import type { AccountUserInfo } from 'lib/types/user-types';

import Button from '../../components/button.react.js';
import SearchModal from '../../modals/search-modal.react';
import css from './user-list.css';
import { UserList, type UserRowProps } from './user-list.react';

type Props = {
  +onClose: () => void,
  +name: string,
  +userRowComponent: React.ComponentType<UserRowProps>,
  +filterUser: (userInfo: AccountUserInfo) => boolean,
  +usersComparator: (user1: AccountUserInfo, user2: AccountUserInfo) => number,
  +buttonLabel: string,
  +onAddUsersClick: () => void,
};

function UserListModal(props: Props): React.Node {
  const {
    onClose,
    name,
    userRowComponent,
    filterUser,
    usersComparator,
    buttonLabel,
    onAddUsersClick,
  } = props;

  const searchModalChildGenerator = React.useCallback(
    (searchText: string) => (
      <div className={css.searchModalContent}>
        <UserList
          userRowComponent={userRowComponent}
          filterUser={filterUser}
          usersComparator={usersComparator}
          searchText={searchText}
        />
        <Button variant="filled" onClick={onAddUsersClick}>
          {buttonLabel}
        </Button>
      </div>
    ),
    [
      buttonLabel,
      filterUser,
      onAddUsersClick,
      userRowComponent,
      usersComparator,
    ],
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
