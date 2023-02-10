// @flow

import classNames from 'classnames';
import _groupBy from 'lodash/fp/groupBy.js';
import _toPairs from 'lodash/fp/toPairs.js';
import * as React from 'react';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import {
  type ThreadInfo,
  type RelativeMemberInfo,
} from 'lib/types/thread-types.js';

import ThreadMember from './member.react.js';
import css from './members-modal.css';

type Props = {
  +threadInfo: ThreadInfo,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
};

function ThreadMembersList(props: Props): React.Node {
  const { threadMembers, threadInfo } = props;
  const [openMenu, setOpenMenu] = React.useState(null);
  const hasMembers = threadMembers.length > 0;

  const threadMembersWithENSNames = useENSNames(threadMembers);

  const groupedByFirstLetterMembers = React.useMemo(
    () =>
      _groupBy(member => stringForUser(member)[0].toLowerCase())(
        threadMembersWithENSNames,
      ),
    [threadMembersWithENSNames],
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
