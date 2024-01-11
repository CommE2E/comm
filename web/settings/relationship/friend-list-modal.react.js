// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { AccountUserInfo, UserInfo } from 'lib/types/user-types.js';

import AddFriendsModal from './add-friends-modal.react.js';
import FriendListRow from './friend-list-row.react.js';
import UserListModal from './user-list-modal.react.js';

const relationships = [
  userRelationshipStatus.REQUEST_RECEIVED,
  userRelationshipStatus.REQUEST_SENT,
  userRelationshipStatus.FRIEND,
];

function filterUser(userInfo: UserInfo) {
  return relationships.includes(userInfo.relationshipStatus);
}

function usersComparator(user1: AccountUserInfo, user2: AccountUserInfo) {
  if (user1.relationshipStatus === user2.relationshipStatus) {
    return user1.username.localeCompare(user2.username);
  }
  return (
    relationships.indexOf(user1.relationshipStatus) -
    relationships.indexOf(user2.relationshipStatus)
  );
}

function FriendListModal(): React.Node {
  const { pushModal } = useModalContext();

  const openNewFriendsModal = React.useCallback(() => {
    pushModal(<AddFriendsModal />);
  }, [pushModal]);

  return (
    <UserListModal
      name="Friend List"
      userRowComponent={FriendListRow}
      filterUser={filterUser}
      usersComparator={usersComparator}
      buttonLabel="Add New Friends"
      onAddUsersClick={openNewFriendsModal}
    />
  );
}

export default FriendListModal;
