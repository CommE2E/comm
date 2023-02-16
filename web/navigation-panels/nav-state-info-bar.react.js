// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ThreadAncestors from './chat-thread-ancestors.react.js';
import css from './nav-state-info-bar.css';

type threadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function NavStateInfoBar(props: threadTopBarProps): React.Node {
  const { threadInfo } = props;
  const threadBackgroundColorStyle = React.useMemo(
    () => ({
      background: `#${threadInfo.color}`,
    }),
    [threadInfo.color],
  );

  const { uiName } = useResolvedThreadInfo(threadInfo);
  return (
    <div className={css.topBarContainer}>
      <div className={css.topBarThreadInfo}>
        <div
          className={css.threadColorSquare}
          style={threadBackgroundColorStyle}
        />
        <p className={css.threadTitle}>{uiName}</p>
        <ThreadAncestors threadInfo={threadInfo} />
      </div>
    </div>
  );
}

export default NavStateInfoBar;
