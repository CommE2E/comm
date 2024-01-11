// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { AccountUserInfo, UserInfo } from 'lib/types/user-types.js';

import css from './user-list.css';
import { UserList, type UserRowProps } from './user-list.react.js';
import Button from '../../components/button.react.js';
import SearchModal from '../../modals/search-modal.react.js';

type Props = {
  +name: string,
  +userRowComponent: React.ComponentType<UserRowProps>,
  +filterUser: (userInfo: UserInfo) => boolean,
  +usersComparator: (user1: AccountUserInfo, user2: AccountUserInfo) => number,
  +buttonLabel: string,
  +onAddUsersClick: () => void,
};

function UserListModal(props: Props): React.Node {
  const {
    name,
    userRowComponent,
    filterUser,
    usersComparator,
    buttonLabel,
    onAddUsersClick,
  } = props;

  const { popModal } = useModalContext();

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
      onClose={popModal}
    >
      {searchModalChildGenerator}
    </SearchModal>
  );
}

export default UserListModal;
