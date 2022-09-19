// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { stringForUser } from 'lib/shared/user-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import AddMembersList from '../../../components/add-members-list.react';

type Props = {
  +searchText: string,
  +searchResult: $ReadOnlySet<string>,
  +communityThreadInfo: ThreadInfo,
  +parentThreadInfo: ThreadInfo,
  +selectedUsers: $ReadOnlySet<string>,
  +toggleUserSelection: (userID: string) => void,
};

function Memberlist(props: Props): React.Node {
  const {
    searchText,
    searchResult,
    communityThreadInfo,
    parentThreadInfo,
    selectedUsers,
    toggleUserSelection,
  } = props;

  const { members: parentMembers } = parentThreadInfo;

  const {
    members: communityMembers,
    name: communityName,
  } = communityThreadInfo;

  const currentUserId = useSelector(state => state.currentUserInfo.id);

  const parentMembersSet = React.useMemo(
    () => new Set(parentThreadInfo.members.map(user => user.id)),
    [parentThreadInfo],
  );

  const parentMemberList = React.useMemo(
    () =>
      parentMembers
        .filter(
          user =>
            user.id !== currentUserId &&
            (searchResult.has(user.id) || searchText.length === 0),
        )
        .map(user => ({ id: user.id, username: stringForUser(user) })),

    [parentMembers, currentUserId, searchResult, searchText],
  );

  const otherMemberList = React.useMemo(
    () =>
      communityMembers
        .filter(
          user =>
            !parentMembersSet.has(user.id) &&
            user.id !== currentUserId &&
            (searchResult.has(user.id) || searchText.length === 0),
        )
        .map(user => ({ id: user.id, username: stringForUser(user) })),
    [
      communityMembers,
      parentMembersSet,
      currentUserId,
      searchResult,
      searchText,
    ],
  );

  const sortedGroupedUserList = React.useMemo(
    () =>
      [
        { header: 'Users in parent channel', userInfos: parentMemberList },
        {
          header: `All users in ${communityName ?? 'community'}`,
          userInfos: otherMemberList,
        },
      ].filter(item => item.userInfos.length),
    [parentMemberList, otherMemberList, communityName],
  );

  return (
    <AddMembersList
      switchUser={toggleUserSelection}
      pendingUsersToAdd={selectedUsers}
      sortedGroupedUsersList={sortedGroupedUserList}
    />
  );
}

export default Memberlist;
