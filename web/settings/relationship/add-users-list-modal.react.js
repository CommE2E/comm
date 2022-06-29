// @flow

import * as React from 'react';

import type {
  UserRelationshipStatus,
  RelationshipAction,
} from 'lib/types/relationship-types.js';

import type { ButtonVariant } from '../../components/button.react.js';
import SearchModal from '../../modals/search-modal.react';
import AddUsersList from './add-users-list.react.js';

type Props = {
  +closeModal: () => void,
  +name: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
  +confirmButtonContent: React.Node,
  +confirmButtonVariant?: ButtonVariant,
  +relationshipAction: RelationshipAction,
};

function AddUsersListModal(props: Props): React.Node {
  const {
    closeModal,
    name,
    excludedStatuses,
    confirmButtonContent,
    confirmButtonVariant = 'primary',
    relationshipAction,
  } = props;

  const addUsersListChildGenerator = React.useCallback(
    (searchText: string) => (
      <AddUsersList
        searchText={searchText}
        excludedStatuses={excludedStatuses}
        confirmButtonContent={confirmButtonContent}
        confirmButtonVariant={confirmButtonVariant}
        relationshipAction={relationshipAction}
        closeModal={closeModal}
      />
    ),
    [
      excludedStatuses,
      confirmButtonContent,
      confirmButtonVariant,
      relationshipAction,
      closeModal,
    ],
  );

  return (
    <SearchModal
      name={name}
      onClose={closeModal}
      size="large"
      searchPlaceholder="Search by name"
    >
      {addUsersListChildGenerator}
    </SearchModal>
  );
}

export default AddUsersListModal;
