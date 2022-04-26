// @flow

import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { userStoreSearchIndex } from 'lib/selectors/user-selectors';
import { memberHasAdminPowers, memberIsAdmin } from 'lib/shared/thread-utils';
import { type RelativeMemberInfo } from 'lib/types/thread-types';

import Tabs from '../../../components/tabs.react';
import { useSelector } from '../../../redux/redux-utils';
import SearchModal from '../../search-modal.react';
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

  return (
    <div className={css.modalContentContainer}>
      <Tabs.Container activeTab={tab} setTab={setTab}>
        {allUsersTab}
        {allAdminsTab}
      </Tabs.Container>
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
