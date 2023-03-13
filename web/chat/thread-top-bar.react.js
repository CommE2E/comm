// @flow

import * as React from 'react';

import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';

type ThreadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function ThreadTopBar(props: ThreadTopBarProps): React.Node {
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

  const { uiName } = useResolvedThreadInfo(threadInfo);
  return (
    <div className={css.topBarContainer}>
      <div className={css.topBarThreadInfo}>
        <div
          className={css.threadColorSquare}
          style={threadBackgroundColorStyle}
        />
        <div className={css.threadTitle}>{uiName}</div>
      </div>
      {threadMenu}
    </div>
  );
}

export default ThreadTopBar;
