// @flow

import classNames from 'classnames';
import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useMembersGroupedByRole } from 'lib/utils/role-utils.js';

import css from './member-list-sidebar.css';
import SortedMemberListGroup from './sorted-member-list-group.react.js';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +threadID: string,
};

function MembersListSidebar(props: Props): React.Node {
  const { threadID } = props;

  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);

  const membersGroupedByRole = useMembersGroupedByRole(threadInfo);

  const [openMenu, setOpenMenu] = React.useState<?string>(null);

  const groupedMemberList = membersGroupedByRole.map(groupedRoleInfo => {
    const { roleName, memberInfos } = groupedRoleInfo;

    return (
      <>
        <div className={css.roleNameText}>{roleName}</div>
        <SortedMemberListGroup
          members={memberInfos}
          threadInfo={threadInfo}
          setOpenMenu={setOpenMenu}
        />
      </>
    );
  });

  const containerClassName = classNames(css.container, {
    [css.noScroll]: !!openMenu,
  });

  return <div className={containerClassName}>{groupedMemberList}</div>;
}

export default MembersListSidebar;
