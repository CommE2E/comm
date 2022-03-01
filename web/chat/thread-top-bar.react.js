// @flow

import * as React from 'react';

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

  return (
    <div className={css.topBarContainer}>
      <div className={css.topBarThreadInfo}>
        <div
          className={css.threadColorSquare}
          style={threadBackgroundColorStyle}
        />
        <p className={css.threadTitle}>{threadInfo.uiName}</p>
        <ThreadAncestors threadInfo={threadInfo} />
      </div>
      <ThreadMenu threadInfo={threadInfo} />
    </div>
  );
}

export default ThreadTopBar;
