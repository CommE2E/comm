// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import ThreadAncestors from './chat-thread-ancestors.react.js';
import css from './nav-state-info-bar.css';

type NavStateInfoBarProps = {
  +threadInfo: ThreadInfo,
};
function NavStateInfoBar(props: NavStateInfoBarProps): React.Node {
  const { threadInfo } = props;

  const threadBackgroundColorStyle = React.useMemo(
    () => ({
      background: `#${threadInfo.color}`,
    }),
    [threadInfo.color],
  );

  return (
    <>
      <div className={css.topBarThreadInfo}>
        <div
          className={css.threadColorSquare}
          style={threadBackgroundColorStyle}
        />
        <ThreadAncestors threadInfo={threadInfo} />
      </div>
    </>
  );
}

type PossiblyEmptyNavStateInfoBarProps = {
  +threadInfoInput: ?ThreadInfo,
};
function PossiblyEmptyNavStateInfoBar(
  props: PossiblyEmptyNavStateInfoBarProps,
): React.Node {
  const { threadInfoInput } = props;

  const [threadInfo, setThreadInfo] = React.useState(threadInfoInput);

  React.useEffect(() => {
    if (threadInfoInput !== threadInfo) {
      if (threadInfoInput) {
        setThreadInfo(threadInfoInput);
      } else {
        const timeout = setTimeout(() => {
          setThreadInfo(null);
        }, 200);
        return () => clearTimeout(timeout);
      }
    }
  }, [threadInfoInput, threadInfo]);

  const content = React.useMemo(() => {
    if (threadInfo) {
      return <NavStateInfoBar threadInfo={threadInfo} />;
    } else {
      return null;
    }
  }, [threadInfo]);

  const classes = classnames(css.topBarContainer, {
    [css.hide]: !threadInfoInput,
    [css.show]: threadInfoInput,
  });
  return <div className={classes}>{content}</div>;
}

export default PossiblyEmptyNavStateInfoBar;
