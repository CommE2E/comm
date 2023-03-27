// @flow

import * as React from 'react';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';
import Avatar from '../components/avatar.react.js';

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
  const avatarInfo = useGetAvatarForThread(threadInfo);

  return (
    <div className={css.topBarContainer}>
      <div className={css.topBarThreadInfo}>
        <Avatar size="small" avatarInfo={avatarInfo} />
        <div className={css.threadTitle}>{uiName}</div>
      </div>
      {threadMenu}
    </div>
  );
}

export default ThreadTopBar;
