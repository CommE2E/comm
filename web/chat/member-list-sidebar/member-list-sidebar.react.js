// @flow

import classNames from 'classnames';
import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useMembersGroupedByRole } from 'lib/utils/role-utils.js';

import css from './member-list-sidebar.css';
import RoleGroupMemberList from './role-group-member-list.react.js';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +threadID: string,
};

function MembersListSidebar(props: Props): React.Node {
  const { threadID } = props;

  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);

  const membersGroupedByRole = useMembersGroupedByRole(threadInfo);

  const [openMenu, setOpenMenu] = React.useState<?string>(null);

  const groupedMemberList = React.useMemo(
    () =>
      Array.from(membersGroupedByRole).map(([roleName, memberInfos], index) => (
        <RoleGroupMemberList
          key={index}
          roleName={roleName}
          members={memberInfos}
          threadInfo={threadInfo}
          setOpenMenu={setOpenMenu}
        />
      )),
    [membersGroupedByRole, threadInfo],
  );

  const containerClassName = classNames(css.container, {
    [css.noScroll]: !!openMenu,
  });

  const memberListSidebar = React.useMemo(
    () => <div className={containerClassName}>{groupedMemberList}</div>,
    [containerClassName, groupedMemberList],
  );

  return memberListSidebar;
}

export default MembersListSidebar;
