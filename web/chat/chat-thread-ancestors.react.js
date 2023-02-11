// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useAncestorThreads } from 'lib/shared/ancestor-threads.js';
import { colorIsDark } from 'lib/shared/thread-utils.js';
import { useKeyserverAdmin } from 'lib/shared/user-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './chat-thread-ancestors.css';
import CommIcon from '../CommIcon.react.js';

const SHOW_SEE_FULL_STRUCTURE = false;

type ThreadAncestorsProps = {
  +threadInfo: ThreadInfo,
};
function ThreadAncestors(props: ThreadAncestorsProps): React.Node {
  const { threadInfo } = props;
  const { color: threadColor } = threadInfo;
  const darkColor = colorIsDark(threadColor);
  const threadColorStyle = React.useMemo(
    () => ({
      backgroundColor: `#${threadColor}`,
      color: darkColor
        ? 'var(--thread-ancestor-color-light)'
        : 'var(--thread-ancestor-color-dark)',
    }),
    [darkColor, threadColor],
  );
  const fullStructureButtonColorStyle = React.useMemo(
    () => ({ color: `#${threadColor}` }),
    [threadColor],
  );

  const ancestorThreads = useAncestorThreads(threadInfo);

  const community = ancestorThreads[0] ?? threadInfo;
  const keyserverAdmin = useKeyserverAdmin(community);
  const keyserverOwnerUsername = keyserverAdmin?.username;

  const resolvedCommunity = useResolvedThreadInfo(community);

  const keyserverInfo = React.useMemo(
    () => (
      <div className={css.ancestorKeyserver}>
        <div className={css.ancestorKeyserverOperator}>
          <CommIcon icon="cloud-filled" size={12} />
          <span>{keyserverOwnerUsername}</span>
        </div>
        <div
          style={threadColorStyle}
          className={classNames(css.ancestorName, css.ancestorKeyserverName)}
        >
          {resolvedCommunity.uiName}
        </div>
      </div>
    ),
    [resolvedCommunity.uiName, keyserverOwnerUsername, threadColorStyle],
  );

  const middlePath = React.useMemo(() => {
    if (ancestorThreads.length < 2) {
      return null;
    }
    return (
      <>
        <SWMansionIcon
          className={css.ancestorSeparator}
          icon="chevron-right"
          size={12}
        />
        <div style={threadColorStyle} className={css.ancestorName}>
          &hellip;
        </div>
      </>
    );
  }, [ancestorThreads.length, threadColorStyle]);

  const threadHasNoAncestors = community === threadInfo;

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const currentThread = React.useMemo(() => {
    if (threadHasNoAncestors) {
      return null;
    }
    return (
      <>
        <SWMansionIcon
          className={css.ancestorSeparator}
          icon="chevron-right"
          size={12}
        />
        <div style={threadColorStyle} className={css.ancestorName}>
          {uiName}
        </div>
      </>
    );
  }, [threadHasNoAncestors, threadColorStyle, uiName]);

  let seeFullStructure = null;
  if (SHOW_SEE_FULL_STRUCTURE) {
    seeFullStructure = (
      <button
        style={fullStructureButtonColorStyle}
        className={css.seeFullStructure}
      >
        See full structure
      </button>
    );
  }

  return (
    <>
      <div className={css.ancestorThreadsContainer}>
        {keyserverInfo}
        {middlePath}
        {currentThread}
      </div>
      {seeFullStructure}
    </>
  );
}

export default ThreadAncestors;
