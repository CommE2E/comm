// @flow

import * as React from 'react';
import { ChevronRight } from 'react-feather';

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

  const pinnedCountBanner = React.useMemo(() => {
    if (!threadInfo.pinnedCount || threadInfo.pinnedCount === 0) {
      return null;
    }

    const singleOrPlural =
      threadInfo.pinnedCount === 1 ? 'message' : 'messages';

    return (
      <div className={css.pinnedCountBanner}>
        <span className={css.pinnedCountText}>
          {threadInfo.pinnedCount} pinned {singleOrPlural}
          <ChevronRight size={14} className={css.chevronRight} />
        </span>
      </div>
    );
  }, [threadInfo.pinnedCount]);

  const { uiName } = useResolvedThreadInfo(threadInfo);
  return (
    <>
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
      {pinnedCountBanner}
    </>
  );
}

export default ThreadTopBar;
