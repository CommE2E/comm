// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
} from 'lib/actions/thread-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import { usePotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadActualMembers } from 'lib/shared/thread-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import AddMembersListContent from './add-members-list-content.react.js';
import css from './members-modal.css';
import Button from '../../../components/button.react.js';
import { useSelector } from '../../../redux/redux-utils.js';
import SearchModal from '../../search-modal.react.js';

type ContentProps = {
  +searchText: string,
  +threadID: string,
  +onClose: () => void,
};

function AddMembersModalContent(props: ContentProps): React.Node {
  const { searchText, threadID, onClose } = props;

  const [pendingUsersToAdd, setPendingUsersToAdd] = React.useState<
    $ReadOnlySet<string>,
  >(new Set());

  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { parentThreadID, community } = threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const excludeUserIDs = React.useMemo(
    () =>
      threadActualMembers(threadInfo.members).concat(
        Array.from(pendingUsersToAdd),
      ),
    [pendingUsersToAdd, threadInfo.members],
  );

  const userSearchResults = usePotentialMemberItems({
    text: searchText,
    userInfos: otherUserInfos,
    excludeUserIDs,
    inputParentThreadInfo: parentThreadInfo,
    inputCommunityThreadInfo: communityThreadInfo,
    threadType: threadInfo.type,
  });
  const userSearchResultsWithENSNames = useENSNames(userSearchResults);

  const onSwitchUser = React.useCallback(
    (userID: string) =>
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

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();

  const addUsers = React.useCallback(() => {
    void dispatchActionPromise(
      changeThreadSettingsActionTypes,
      callChangeThreadSettings({
        threadID,
        changes: { newMemberIDs: Array.from(pendingUsersToAdd) },
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
        <AddMembersListContent
          userListItems={userSearchResultsWithENSNames}
          switchUser={onSwitchUser}
          pendingUsersToAdd={pendingUsersToAdd}
          hasParentThread={!!threadInfo.parentThreadID}
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

export { AddMembersModal, AddMembersModalContent };
