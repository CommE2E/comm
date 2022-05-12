// @flow

import * as React from 'react';

import { userRelationshipStatus } from 'lib/types/relationship-types';
import type { AccountUserInfo } from 'lib/types/user-types';

import BlockListRow from './block-list-row.react';
import UserListModal from './user-list-modal.react';

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
  return (
    <UserListModal
      onClose={onClose}
      name="Block List"
      userRowComponent={BlockListRow}
      filterUser={filterUser}
      usersComparator={usersComparator}
    />
  );
}

export default BlockListModal;
