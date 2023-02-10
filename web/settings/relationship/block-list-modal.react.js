// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';

import BlockListRow from './block-list-row.react.js';
import BlockUsersModal from './block-users-modal.react.js';
import UserListModal from './user-list-modal.react.js';

function filterUser(userInfo: AccountUserInfo) {
  return (
    userInfo.relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
    userInfo.relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
  );
}

function usersComparator(user1: AccountUserInfo, user2: AccountUserInfo) {
  return user1.username.localeCompare(user2.username);
}

type Props = {
  +onClose: () => void,
};

function BlockListModal(props: Props): React.Node {
  const { onClose } = props;

  const { pushModal } = useModalContext();
  const openBlockUsersModal = React.useCallback(() => {
    pushModal(<BlockUsersModal onClose={onClose} />);
  }, [onClose, pushModal]);

  return (
    <UserListModal
      onClose={onClose}
      name="Block List"
      userRowComponent={BlockListRow}
      filterUser={filterUser}
      usersComparator={usersComparator}
      buttonLabel="Block Users"
      onAddUsersClick={openBlockUsersModal}
    />
  );
}

export default BlockListModal;
