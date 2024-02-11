// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
} from 'lib/actions/thread-actions.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './members-modal.css';
import Button from '../../../components/button.react.js';
import {
  AddUsersListProvider,
  useAddUsersListContext,
} from '../../../settings/relationship/add-users-list-provider.react.js';
import AddUsersList from '../../../settings/relationship/add-users-list.react.js';
import { useAddMembersListUserInfos } from '../../../settings/relationship/add-users-utils.js';
import SearchModal from '../../search-modal.react.js';

type ContentProps = {
  +searchText: string,
  +threadID: string,
};

function AddMembersList(props: ContentProps): React.Node {
  const { searchText, threadID } = props;

  const { userInfos, sortedUsersWithENSNames } = useAddMembersListUserInfos({
    threadID,
    searchText,
  });

  const addMembersList = React.useMemo(
    () => (
      <div className={css.addMembersListContainer}>
        <AddUsersList
          searchModeActive={searchText.length > 0}
          userInfos={userInfos}
          sortedUsersWithENSNames={sortedUsersWithENSNames}
        />
      </div>
    ),
    [searchText.length, sortedUsersWithENSNames, userInfos],
  );

  return addMembersList;
}

type Props = {
  +threadID: string,
  +onClose: () => void,
};

function AddMembersModalContent(props: Props): React.Node {
  const { threadID, onClose } = props;

  const { pendingUsersToAdd } = useAddUsersListContext();

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();

  const addUsers = React.useCallback(() => {
    void dispatchActionPromise(
      changeThreadSettingsActionTypes,
      callChangeThreadSettings({
        threadID,
        changes: { newMemberIDs: Array.from(pendingUsersToAdd.keys()) },
      }),
    );
    onClose();
  }, [
    callChangeThreadSettings,
    dispatchActionPromise,
    onClose,
    pendingUsersToAdd,
    threadID,
  ]);

  const primaryButton = React.useMemo(
    () => (
      <Button
        disabled={!pendingUsersToAdd.size}
        variant="filled"
        onClick={addUsers}
      >
        Add selected members
      </Button>
    ),
    [addUsers, pendingUsersToAdd.size],
  );

  const addMembersList = React.useCallback(
    (searchText: string) => (
      <AddMembersList searchText={searchText} threadID={threadID} />
    ),
    [threadID],
  );

  return (
    <SearchModal
      name="Add members"
      searchPlaceholder="Search members"
      onClose={onClose}
      size="large"
      primaryButton={primaryButton}
    >
      {addMembersList}
    </SearchModal>
  );
}

function AddMembersModal(props: Props): React.Node {
  const { threadID, onClose } = props;

  return (
    <AddUsersListProvider>
      <AddMembersModalContent threadID={threadID} onClose={onClose} />
    </AddUsersListProvider>
  );
}

export { AddMembersModal, AddMembersList };
