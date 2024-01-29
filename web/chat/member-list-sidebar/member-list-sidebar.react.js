// @flow

import classNames from 'classnames';
import * as React from 'react';

import {
  threadInfoSelector,
  threadMembersSelectorForThread,
} from 'lib/selectors/thread-selectors.js';

import css from './member-list-sidebar.css';
import ThreadMember from '../../modals/threads/members/member.react.js';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +threadID: string,
};

function MembersListSidebar(props: Props): React.Node {
  const { threadID } = props;

  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);

  const threadMembersSelector = threadMembersSelectorForThread(threadID);

  const memberRolesMap = useSelector(threadMembersSelector);
  const { roles } = threadInfo;

  const [openMenu, setOpenMenu] = React.useState<?string>(null);

  const groupedMemberList = React.useMemo(
    () =>
      [...memberRolesMap.keys()].map(roleID => {
        const memberList = memberRolesMap.get(roleID);
        const roleName = roles[roleID].name;

        if (!memberList || memberList.length === 0) {
          return null;
        }

        return (
          <>
            <div className={css.roleNameText}>{roleName}</div>
            {memberList.map(member => (
              <ThreadMember
                key={member.id}
                memberInfo={member}
                threadInfo={threadInfo}
                setOpenMenu={setOpenMenu}
              />
            ))}
          </>
        );
      }),
    [memberRolesMap, roles, threadInfo],
  );

  const containerClassName = classNames(css.container, {
    [css.noScroll]: !!openMenu,
  });

  return <div className={containerClassName}>{groupedMemberList}</div>;
}

export default MembersListSidebar;
