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
  +onClose: () => void,
};

function AddMembersModalContent(props: ContentProps): React.Node {
  const { searchText, threadID, onClose } = props;

  const { pendingUsersToAdd } = useAddUsersListContext();

  const { userInfos, sortedUsersWithENSNames } = useAddMembersListUserInfos({
    threadID,
    searchText,
  });

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

  return (
    <div className={css.addMembersContent}>
      <div className={css.addMembersListContainer}>
        <AddUsersList
          searchModeActive={searchText.length > 0}
          userInfos={userInfos}
          sortedUsersWithENSNames={sortedUsersWithENSNames}
        />
      </div>
      <div className={css.addMembersFooter}>
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button
          disabled={!pendingUsersToAdd.size}
          variant="filled"
          onClick={addUsers}
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

function AddMembersModalWrapper(props: Props): React.Node {
  const { threadID, onClose } = props;

  return (
    <AddUsersListProvider>
      <AddMembersModal threadID={threadID} onClose={onClose} />
    </AddUsersListProvider>
  );
}

export { AddMembersModalWrapper, AddMembersModalContent };
