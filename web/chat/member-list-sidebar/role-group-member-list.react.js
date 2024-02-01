// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './role-group-member-list.css';
import ThreadMember from '../../modals/threads/members/member.react.js';

type Props = {
  +roleName: string,
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +threadInfo: ThreadInfo,
  +setOpenMenu: SetState<?string>,
};

function RoleGroupMemberList(props: Props): React.Node {
  const { roleName, members, threadInfo, setOpenMenu } = props;

  const memberList = React.useMemo(
    () =>
      members.map(member => (
        <ThreadMember
          key={member.id}
          memberInfo={member}
          threadInfo={threadInfo}
          setOpenMenu={setOpenMenu}
        />
      )),
    [setOpenMenu, members, threadInfo],
  );

  const roleGroupMemberList = React.useMemo(
    () => (
      <>
        <div className={css.roleNameText}>{roleName}</div>
        {memberList}
      </>
    ),
    [memberList, roleName],
  );

  return roleGroupMemberList;
}

export default RoleGroupMemberList;
