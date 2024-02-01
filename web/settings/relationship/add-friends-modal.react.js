// @flow

import * as React from 'react';

import {
  relationshipActions,
  userRelationshipStatus,
} from 'lib/types/relationship-types.js';

import AddUsersListModal from './add-users-list-modal.react.js';
import { AddUsersListProvider } from './add-users-list-provider.react.js';

const excludedStatuses = new Set([
  userRelationshipStatus.FRIEND,
  userRelationshipStatus.BLOCKED_VIEWER,
  userRelationshipStatus.BOTH_BLOCKED,
  userRelationshipStatus.REQUEST_SENT,
  userRelationshipStatus.REQUEST_RECEIVED,
]);

function AddFriendsModal(): React.Node {
  const addFriendsModal = React.useMemo(
    () => (
      <AddUsersListProvider>
        <AddUsersListModal
          name="Add friends"
          excludedStatuses={excludedStatuses}
          confirmButtonContent="Send friend requests"
          relationshipAction={relationshipActions.FRIEND}
        />
      </AddUsersListProvider>
    ),
    [],
  );

  return addFriendsModal;
}

export default AddFriendsModal;
