// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  userSearchIndexForPotentialMembers,
  userInfoSelectorForPotentialMembers,
} from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadActualMembers } from 'lib/shared/thread-utils.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import Button from '../../../components/button.react.js';
import Label from '../../../components/label.react.js';
import { useSelector } from '../../../redux/redux-utils.js';
import SearchModal from '../../search-modal.react.js';
import AddMembersListContent from './add-members-list-content.react.js';
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
  const userSearchResultsWithENSNames = useENSNames(userSearchResults);

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

  const pendingUserInfos = React.useMemo(
    () =>
      Array.from(pendingUsersToAdd)
        .map(userID => ({
          id: userID,
          username: otherUserInfos[userID].username,
        }))
        .sort((a, b) => a.username.localeCompare(b.username)),
    [otherUserInfos, pendingUsersToAdd],
  );
  const pendingUserInfosWithENSNames = useENSNames(pendingUserInfos);

  const labelItems = React.useMemo(() => {
    if (!pendingUserInfosWithENSNames.length) {
      return null;
    }
    return (
      <div className={css.addMembersPendingList}>
        {pendingUserInfosWithENSNames.map(userInfo => (
          <Label key={userInfo.id} onClose={() => onSwitchUser(userInfo.id)}>
            {userInfo.username}
          </Label>
        ))}
      </div>
    );
  }, [onSwitchUser, pendingUserInfosWithENSNames]);

  return (
    <div className={css.addMembersContent}>
      {labelItems}
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

export default AddMembersModal;
