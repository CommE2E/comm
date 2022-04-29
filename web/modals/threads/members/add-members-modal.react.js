// @flow

import * as React from 'react';

import Button from '../../../components/button.react';
import SearchModal from '../../search-modal.react';
import AddMembersList from './add-members-list.react';
import css from './members-modal.css';

type ContentProps = {
  +searchText: string,
  +threadID: string,
  +onClose: () => void,
};

function AddMembersModalContent(props: ContentProps): React.Node {
  const { onClose } = props;

  const [pendingUsersToAdd, setPendingUsersToAdd] = React.useState<
    $ReadOnlySet<string>,
  >(new Set());

  const userSearchResults = [];

  const onSwitchUser = React.useCallback(
    userID =>
      setPendingUsersToAdd(users => {
        const newUsers = new Set(users);
        if (newUsers.has(userID)) {
          newUsers.delete(userID);
        } else {
          newUsers.add(userID);
        }
        return newUsers;
      }),
    [],
  );

  return (
    <div className={css.addMembersContent}>
      <div className={css.addMembersListContainer}>
        <AddMembersList
          userListItems={userSearchResults}
          switchUser={onSwitchUser}
          pendingUsersToAdd={pendingUsersToAdd}
        />
      </div>
      <div className={css.addMembersFooter}>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          disabled={!pendingUsersToAdd.size}
          variant="primary"
          onClick={() => {}}
        >
          Add selected members
        </Button>
      </div>
    </div>
  );
}

type Props = {
  +threadID: string,
  +onClose: () => void,
};

function AddMembersModal(props: Props): React.Node {
  const { threadID, onClose } = props;

  const addMembersModalContent = React.useCallback(
    (searchText: string) => (
      <AddMembersModalContent
        searchText={searchText}
        threadID={threadID}
        onClose={onClose}
      />
    ),
    [onClose, threadID],
  );

  return (
    <SearchModal
      name="Add members"
      searchPlaceholder="Search members"
      onClose={onClose}
      size="fit-content"
    >
      {addMembersModalContent}
    </SearchModal>
  );
}

export default AddMembersModal;
