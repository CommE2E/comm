// @flow

import * as React from 'react';

import { unreadCountSelectorForCommunity } from 'lib/selectors/thread-selectors.js';
import type { ResolvedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './community-list-item.css';
import { navigationSidebarLabelTooltipMargin } from './navigation-sidebar-constants.js';
import NavigationSidebarTabIndicator from './navigation-sidebar-tab-indicator.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import UnreadBadge from '../components/unread-badge.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useLabelTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
};

function CommunityListItem(props: Props): React.Node {
  const { threadInfo } = props;
  const { id: threadID } = threadInfo;

  const communityUnreadCountSelector =
    unreadCountSelectorForCommunity(threadID);
  const unreadCountValue = useSelector(communityUnreadCountSelector);

  const unreadBadge = React.useMemo(() => {
    if (unreadCountValue === 0) {
      return null;
    }
    return (
      <div className={css.unreadBadgeContainer}>
        <UnreadBadge unreadCount={unreadCountValue} />
      </div>
    );
  }, [unreadCountValue]);

  const { onMouseEnter, onMouseLeave } = useLabelTooltip({
    tooltipLabel: threadInfo.uiName,
    position: tooltipPositions.RIGHT,
    tooltipMargin: navigationSidebarLabelTooltipMargin,
  });

  return (
    <div>
      <NavigationSidebarTabIndicator isActive={false} />
      <div
        className={css.container}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <ThreadAvatar size="S" threadInfo={threadInfo} />
        {unreadBadge}
      </div>
    </div>
  );
}

export default CommunityListItem;
