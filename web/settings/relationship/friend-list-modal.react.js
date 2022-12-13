// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react';
import { userRelationshipStatus } from 'lib/types/relationship-types';
import type { AccountUserInfo } from 'lib/types/user-types';

import AddFriendsModal from './add-friends-modal.react';
import FriendListRow from './friend-list-row.react';
import UserListModal from './user-list-modal.react';

const relationships = [
  userRelationshipStatus.REQUEST_RECEIVED,
  userRelationshipStatus.REQUEST_SENT,
  userRelationshipStatus.FRIEND,
];

function filterUser(userInfo: AccountUserInfo) {
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

type Props = {
  +onClose: () => void,
};

function FriendListModal(props: Props): React.Node {
  const { onClose } = props;

  const { pushModal } = useModalContext();
  const openNewFriendsModal = React.useCallback(() => {
    pushModal(<AddFriendsModal onClose={onClose} />);
  }, [onClose, pushModal]);

  return (
    <UserListModal
      onClose={onClose}
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
