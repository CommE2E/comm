// @flow

import * as React from 'react';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import css from './community-list-item.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { useNavigationSidebarTooltip } from '../utils/tooltip-action-utils.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
};

function CommunityListItem(props: Props): React.Node {
  const { threadInfo } = props;

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
    </div>
  );
}

export default CommunityListItem;
