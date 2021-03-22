// @flow

import classNames from 'classnames';
import * as React from 'react';
import {
  CornerDownRight as CornerDownRightIcon,
  CornerDownLeft as CornerDownLeftIcon,
} from 'react-feather';

import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';
import { stringForUser } from 'lib/shared/user-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import { pluralizeAndTrim } from 'lib/utils/text-utils';

import { useSelector } from '../redux/redux-utils';
import { useOnClickThread } from '../selectors/nav-selectors';
import css from './chat-message-list.css';

type Props = {|
  +threadInfo: ThreadInfo,
  +positioning: 'left' | 'center' | 'right',
|};
function InlineSidebar(props: Props) {
  const { threadInfo } = props;

  const onClick = useOnClickThread(threadInfo.id);

  let viewerIcon, nonViewerIcon, alignStyle;
  if (props.positioning === 'right') {
    viewerIcon = (
      <CornerDownLeftIcon className={css.inlineSidebarIcon} size={18} />
    );
    alignStyle = css.viewerMessageBoxContainer;
  } else if (props.positioning === 'left') {
    nonViewerIcon = (
      <CornerDownRightIcon className={css.inlineSidebarIcon} size={18} />
    );
    alignStyle = css.nonViewerMessageBoxContainer;
  } else {
    nonViewerIcon = (
      <CornerDownRightIcon className={css.inlineSidebarIcon} size={18} />
    );
    alignStyle = css.centerContainer;
  }

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
        {viewerIcon}
      </div>
    </div>
  );
}

const inlineSidebarHeight = 20;

export { InlineSidebar, inlineSidebarHeight };
