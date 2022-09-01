// @flow

import classNames from 'classnames';
import _groupBy from 'lodash/fp/groupBy';
import _toPairs from 'lodash/fp/toPairs';
import * as React from 'react';

import { stringForUser } from 'lib/shared/user-utils';
import {
  type ThreadInfo,
  type RelativeMemberInfo,
} from 'lib/types/thread-types';

import ThreadMember from './member.react';
import css from './members-modal.css';

type Props = {
  +threadInfo: ThreadInfo,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
};

function ThreadMembersList(props: Props): React.Node {
  const { threadMembers, threadInfo } = props;
  const [openMenu, setOpenMenu] = React.useState(null);
  const hasMembers = threadMembers.length > 0;

  const groupedByFirstLetterMembers = React.useMemo(
    () =>
      _groupBy(member => stringForUser(member)[0].toLowerCase())(threadMembers),
    [threadMembers],
  );

  const groupedMembersList = React.useMemo(
    () =>
      _toPairs(groupedByFirstLetterMembers)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([letter, users]) => {
          const userList = users
            .sort((a, b) => stringForUser(a).localeCompare(stringForUser(b)))
            .map((user: RelativeMemberInfo) => (
              <ThreadMember
                key={user.id}
                memberInfo={user}
                threadInfo={threadInfo}
                setOpenMenu={setOpenMenu}
                isMenuOpen={openMenu === user.id}
              />
            ));
          const letterHeader = (
            <h5 className={css.memberletterHeader} key={letter}>
              {letter.toUpperCase()}
            </h5>
          );
          return (
            <React.Fragment key={letter}>
              {letterHeader}
              {userList}
            </React.Fragment>
          );
        }),
    [groupedByFirstLetterMembers, openMenu, threadInfo],
  );
  let content = groupedMembersList;
  if (!hasMembers) {
    content = (
      <div className={css.noUsers}>
        No matching users were found in the chat!
      </div>
    );
  }
  const membersListClasses = classNames(css.membersList, {
    [css.noScroll]: !!openMenu,
  });
  return <div className={membersListClasses}>{content}</div>;
}

export default ThreadMembersList;
