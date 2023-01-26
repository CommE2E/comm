// @flow

import * as React from 'react';

import { threadIsPending } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import ThreadAncestors from './chat-thread-ancestors.react';
import ThreadMenu from './thread-menu.react';
import css from './thread-top-bar.css';

type threadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function ThreadTopBar(props: threadTopBarProps): React.Node {
  const { threadInfo } = props;
  const threadBackgroundColorStyle = React.useMemo(
    () => ({
      background: `#${threadInfo.color}`,
    }),
    [threadInfo.color],
  );

  let threadMenu = null;
  if (!threadIsPending(threadInfo.id)) {
    threadMenu = <ThreadMenu threadInfo={threadInfo} />;
  }

  return (
    <div className={css.topBarContainer}>
      <div className={css.topBarThreadInfo}>
        <div
          className={css.threadColorSquare}
          style={threadBackgroundColorStyle}
        />
        <div className={css.threadTitle}>{threadInfo.uiName}</div>
        <ThreadAncestors threadInfo={threadInfo} />
      </div>
      {threadMenu}
    </div>
  );
}

export default ThreadTopBar;
