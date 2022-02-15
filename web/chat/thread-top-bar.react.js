// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import SWMansionIcon from '../SWMansionIcon.react';
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
      </div>
      <button className={css.topBarMenu}>
        <SWMansionIcon icon="menu-vertical" size={20} />
      </button>
    </div>
  );
}

export default ThreadTopBar;
