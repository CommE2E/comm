// @flow

import classNames from 'classnames';
import * as React from 'react';

import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';
import { stringForUser } from 'lib/shared/user-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import { pluralizeAndTrim } from 'lib/utils/text-utils';

import { useSelector } from '../redux/redux-utils';
import { useOnClickThread } from '../selectors/nav-selectors';
import css from './inline-sidebar.css';

type Props = {
  +threadInfo: ThreadInfo,
  +positioning: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo } = props;

  const onClick = useOnClickThread(threadInfo);

  let nonViewerIcon, alignStyle;

  const unreadStyle = threadInfo.currentUser.unread ? css.unread : null;
  const repliesCount = threadInfo.repliesCount || 1;
  const repliesText = `${repliesCount} ${
    repliesCount > 1 ? 'replies' : 'reply'
  }`;

  const threadMembers = useSelector(
    relativeMemberInfoSelectorForMembersOfThread(threadInfo.id),
  );
  const sendersText = React.useMemo(() => {
    const senders = threadMembers
      .filter(member => member.isSender)
      .map(stringForUser);
    return senders.length > 0 ? `${pluralizeAndTrim(senders, 25)} sent ` : '';
  }, [threadMembers]);

  return (
    <div className={classNames([css.inlineSidebarContent, alignStyle])}>
      <div onClick={onClick} className={css.inlineSidebar}>
        {nonViewerIcon}
        <div className={classNames([css.inlineSidebarName, unreadStyle])}>
          {sendersText}
          {repliesText}
        </div>
      </div>
    </div>
  );
}

const inlineSidebarHeight = 20;

export { InlineSidebar, inlineSidebarHeight };
