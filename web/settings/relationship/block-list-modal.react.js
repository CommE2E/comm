// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { AccountUserInfo, UserInfo } from 'lib/types/user-types.js';

import BlockListRow from './block-list-row.react.js';
import BlockUsersModal from './block-users-modal.react.js';
import UserListModal from './user-list-modal.react.js';

function filterUser(userInfo: UserInfo) {
  return (
    userInfo.relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
    userInfo.relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
  );
}

function usersComparator(user1: AccountUserInfo, user2: AccountUserInfo) {
  return user1.username.localeCompare(user2.username);
}

function BlockListModal(): React.Node {
  const { pushModal } = useModalContext();
  const openBlockUsersModal = React.useCallback(() => {
    pushModal(<BlockUsersModal />);
  }, [pushModal]);

  return (
    <UserListModal
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
