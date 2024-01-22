// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

import ThreadAncestors from './chat-thread-ancestors.react.js';
import css from './nav-state-info-bar.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';

type NavStateInfoBarProps = {
  +threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
};
function NavStateInfoBar(props: NavStateInfoBarProps): React.Node {
  const { threadInfo } = props;

  return (
    <>
      <div className={css.avatarContainer}>
        <ThreadAvatar size="S" threadInfo={threadInfo} />
      </div>
      <ThreadAncestors threadInfo={threadInfo} />
    </>
  );
}

type PossiblyEmptyNavStateInfoBarProps = {
  +threadInfoInput: ?LegacyThreadInfo | ?MinimallyEncodedThreadInfo,
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
    return undefined;
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
