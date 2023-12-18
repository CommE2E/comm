// @flow

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils.js';
import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';

import css from './community-list-item.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import UnreadBadge from '../components/unread-badge.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useNavigationSidebarTooltip } from '../utils/tooltip-action-utils.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
};

function CommunityListItem(props: Props): React.Node {
  const { threadInfo } = props;
  const { id: threadID } = threadInfo;

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const unreadCountValue = React.useMemo(
    () =>
      values(threadInfos).filter(
        communityInfo =>
          threadInHomeChatList(communityInfo) &&
          communityInfo.currentUser.unread &&
          threadID === communityInfo.community,
      ).length,
    [threadID, threadInfos],
  );

  const { onMouseEnter, onMouseLeave } = useNavigationSidebarTooltip({
    tooltipLabel: threadInfo.uiName,
  });

  return (
    <div
      className={css.container}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <ThreadAvatar size="S" threadInfo={threadInfo} />
      <div className={css.unreadBadgeContainer}>
        <UnreadBadge unreadCount={unreadCountValue} />
      </div>
    </div>
  );
}

export default CommunityListItem;
