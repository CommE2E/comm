// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  userSearchIndexForPotentialMembers,
  userInfoSelectorForPotentialMembers,
} from 'lib/selectors/user-selectors';
import { getPotentialMemberItems } from 'lib/shared/search-utils';
import { threadActualMembers } from 'lib/shared/thread-utils';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../../../components/button.react';
import Label from '../../../components/label.react';
import { useSelector } from '../../../redux/redux-utils';
import SearchModal from '../../search-modal.react';
import AddMembersListContent from './add-members-list-content.react';
import css from './members-modal.css';

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
  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);
  const excludeUserIDs = React.useMemo(
    () =>
      threadActualMembers(threadInfo.members).concat(
        Array.from(pendingUsersToAdd),
      ),
    [pendingUsersToAdd, threadInfo.members],
  );

  const userSearchResults = React.useMemo(
    () =>
      getPotentialMemberItems(
        searchText,
        otherUserInfos,
        userSearchIndex,
        excludeUserIDs,
        parentThreadInfo,
        communityThreadInfo,
        threadInfo.type,
      ),
    [
      communityThreadInfo,
      excludeUserIDs,
      otherUserInfos,
      parentThreadInfo,
      searchText,
      threadInfo.type,
      userSearchIndex,
    ],
  );

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

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);

  const addUsers = React.useCallback(() => {
    dispatchActionPromise(
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

  const pendingUsersWithNames = React.useMemo(
    () =>
      Array.from(pendingUsersToAdd)
        .map(userID => [userID, otherUserInfos[userID].username])
        .sort((a, b) => a[1].localeCompare(b[1])),
    [otherUserInfos, pendingUsersToAdd],
  );

  const labelItems = React.useMemo(() => {
    if (!pendingUsersWithNames.length) {
      return null;
    }
    return (
      <div className={css.addMembersPendingList}>
        {pendingUsersWithNames.map(([userID, username]) => (
          <Label key={userID} onClose={() => onSwitchUser(userID)}>
            {username}
          </Label>
        ))}
      </div>
    );
  }, [onSwitchUser, pendingUsersWithNames]);

  return (
    <div className={css.addMembersContent}>
      {labelItems}
      <div className={css.addMembersListContainer}>
        <AddMembersListContent
          userListItems={userSearchResults}
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

export default AddMembersModal;
