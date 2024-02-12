// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import css from './community-creation-members-modal.css';
import Button from '../../components/button.react.js';
import Search from '../../components/search.react.js';
import Modal from '../../modals/modal.react.js';
import { AddMembersList } from '../../modals/threads/members/add-members-modal.react.js';
import {
  useAddUsersListContext,
  AddUsersListProvider,
} from '../../settings/relationship/add-users-list-provider.react.js';

type Props = {
  +threadID: string,
  +onClose: () => void,
};
function CommunityCreationMembersModalContent(props: Props): React.Node {
  const { threadID, onClose } = props;

  const { pendingUsersToAdd } = useAddUsersListContext();

  const [searchText, setSearchText] = React.useState('');

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

  return (
    <Modal
      name="Add members to the community"
      subtitle="You may also add members later"
      onClose={onClose}
      size="large"
      subheader={<CommunityCreationKeyserverLabel />}
      primaryButton={primaryButton}
    >
      <div className={css.container}>
        <div>
          <Search
            onChangeText={setSearchText}
            searchText={searchText}
            placeholder="Search members"
          />
        </div>
        <AddMembersList searchText={searchText} threadID={threadID} />
      </div>
    </Modal>
  );
}

function CommunityCreationMembersModal(props: Props): React.Node {
  const { threadID } = props;

  const { popModal } = useModalContext();

  return (
    <AddUsersListProvider>
      <CommunityCreationMembersModalContent
        threadID={threadID}
        onClose={popModal}
      />
    </AddUsersListProvider>
  );
}

export default CommunityCreationMembersModal;
