// @flow

import * as React from 'react';

import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';
import ThreadAvatar from '../components/thread-avatar.react.js';

type ThreadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function ThreadTopBar(props: ThreadTopBarProps): React.Node {
  const { threadInfo } = props;

  let threadMenu = null;
  if (!threadIsPending(threadInfo.id)) {
    threadMenu = <ThreadMenu threadInfo={threadInfo} />;
  }

  const { uiName } = useResolvedThreadInfo(threadInfo);

  return (
    <div className={css.topBarContainer}>
      <div className={css.topBarThreadInfo}>
        <ThreadAvatar size="small" threadInfo={threadInfo} />
        <div className={css.threadTitle}>{uiName}</div>
      </div>
      {threadMenu}
    </div>
  );
}

export default ThreadTopBar;
