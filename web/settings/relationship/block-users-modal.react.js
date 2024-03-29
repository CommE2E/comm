// @flow

import { faUserShield } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import {
  relationshipActions,
  userRelationshipStatus,
} from 'lib/types/relationship-types.js';

import AddUsersListModal from './add-users-list-modal.react.js';
import { AddUsersListProvider } from './add-users-list-provider.react.js';
import { buttonThemes } from '../../components/button.react.js';

const excludedStatuses = new Set([
  userRelationshipStatus.BOTH_BLOCKED,
  userRelationshipStatus.BLOCKED_BY_VIEWER,
]);

function BlockUsersModal(): React.Node {
  const buttonContent = React.useMemo(
    () => (
      <div>
        <FontAwesomeIcon icon={faUserShield} />
        {' Block users'}
      </div>
    ),
    [],
  );

  const blockUsersModal = React.useMemo(
    () => (
      <AddUsersListProvider>
        <AddUsersListModal
          name="Block users"
          excludedStatuses={excludedStatuses}
          confirmButtonContent={buttonContent}
          confirmButtonColor={buttonThemes.danger}
          relationshipAction={relationshipActions.BLOCK}
        />
      </AddUsersListProvider>
    ),
    [buttonContent],
  );

  return blockUsersModal;
}

export default BlockUsersModal;
