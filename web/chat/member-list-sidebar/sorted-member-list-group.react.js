// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';

import ThreadMember from '../../modals/threads/members/member.react.js';
import { useSortedENSResolvedUsers } from '../../settings/relationship/user-list-hooks.js';

type Props = {
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +threadInfo: ThreadInfo,
  +setOpenMenu: SetState<?string>,
};

function SortedMemberListGroup(props: Props): React.Node {
  const { members, threadInfo, setOpenMenu } = props;

  const sortedENSResolvedUsers = useSortedENSResolvedUsers(members);

  const memberList = React.useMemo(
    () =>
      sortedENSResolvedUsers.map(member => (
        <ThreadMember
          key={member.id}
          memberInfo={member}
          threadInfo={threadInfo}
          setOpenMenu={setOpenMenu}
        />
      )),
    [setOpenMenu, sortedENSResolvedUsers, threadInfo],
  );

  return memberList;
}

export default SortedMemberListGroup;
