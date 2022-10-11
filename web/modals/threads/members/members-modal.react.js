// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { userStoreSearchIndex } from 'lib/selectors/user-selectors';
import {
  memberHasAdminPowers,
  memberIsAdmin,
  threadHasPermission,
} from 'lib/shared/thread-utils';
import {
  type RelativeMemberInfo,
  threadPermissions,
} from 'lib/types/thread-types';

import Button from '../../../components/button.react';
import Tabs from '../../../components/tabs.react';
import { useSelector } from '../../../redux/redux-utils';
import SearchModal from '../../search-modal.react';
import AddMembersModal from './add-members-modal.react';
import ThreadMembersList from './members-list.react';
import css from './members-modal.css';

type ContentProps = {
  +searchText: string,
  +threadID: string,
};
function ThreadMembersModalContent(props: ContentProps): React.Node {
  const { threadID, searchText } = props;

  const [tab, setTab] = React.useState<'All Members' | 'Admins'>('All Members');

  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const { members: threadMembersNotFiltered } = threadInfo;

  const userSearchIndex = useSelector(userStoreSearchIndex);
  const userIDs = React.useMemo(
    () => userSearchIndex.getSearchResults(searchText),
    [searchText, userSearchIndex],
  );

  const allMembers = React.useMemo(
    () =>
      threadMembersNotFiltered.filter(
        (member: RelativeMemberInfo) =>
          searchText.length === 0 || userIDs.includes(member.id),
      ),
    [searchText.length, threadMembersNotFiltered, userIDs],
  );
  const adminMembers = React.useMemo(
    () =>
      allMembers.filter(
        (member: RelativeMemberInfo) =>
          memberIsAdmin(member, threadInfo) || memberHasAdminPowers(member),
      ),
    [allMembers, threadInfo],
  );

  const allUsersTab = React.useMemo(
    () => (
      <Tabs.Item id="All Members" header="All Members">
        <ThreadMembersList threadInfo={threadInfo} threadMembers={allMembers} />
      </Tabs.Item>
    ),
    [allMembers, threadInfo],
  );

  const allAdminsTab = React.useMemo(
    () => (
      <Tabs.Item id="Admins" header="Admins">
        <ThreadMembersList
          threadInfo={threadInfo}
          threadMembers={adminMembers}
        />
      </Tabs.Item>
    ),
    [adminMembers, threadInfo],
  );

  const { pushModal, popModal } = useModalContext();

  const onClickAddMembers = React.useCallback(() => {
    pushModal(<AddMembersModal onClose={popModal} threadID={threadID} />);
  }, [popModal, pushModal, threadID]);

  const canAddMembers = threadHasPermission(
    threadInfo,
    threadPermissions.ADD_MEMBERS,
  );

  const addMembersButton = React.useMemo(() => {
    if (!canAddMembers) {
      return null;
    }
    return (
      <div className={css.addNewMembers}>
        <Button variant="filled" onClick={onClickAddMembers}>
          Add members
        </Button>
      </div>
    );
  }, [canAddMembers, onClickAddMembers]);

  return (
    <div className={css.modalContentContainer}>
      <div className={css.membersListTabs}>
        <Tabs.Container activeTab={tab} setTab={setTab}>
          {allUsersTab}
          {allAdminsTab}
        </Tabs.Container>
      </div>
      {addMembersButton}
    </div>
  );
}

type Props = {
  +threadID: string,
  +onClose: () => void,
};
function ThreadMembersModal(props: Props): React.Node {
  const { onClose, threadID } = props;
  const renderModalContent = React.useCallback(
    (searchText: string) => (
      <ThreadMembersModalContent threadID={threadID} searchText={searchText} />
    ),
    [threadID],
  );
  return (
    <SearchModal
      name="Members"
      searchPlaceholder="Search members"
      onClose={onClose}
      size="fit-content"
    >
      {renderModalContent}
    </SearchModal>
  );
}

export default ThreadMembersModal;
