// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useAncestorThreads } from 'lib/shared/ancestor-threads';
import { colorIsDark } from 'lib/shared/thread-utils';
import { getKeyserverAdmin } from 'lib/shared/user-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../CommIcon.react';
import { useSelector } from '../redux/redux-utils';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-thread-ancestors.css';

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

  const userInfos = useSelector(state => state.userStore.userInfos);
  const community = ancestorThreads[0] ?? threadInfo;
  const keyserverOwnerUsername: ?string = React.useMemo(
    () => getKeyserverAdmin(community, userInfos)?.username,
    [community, userInfos],
  );

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
          {community.uiName}
        </div>
      </div>
    ),
    [community.uiName, keyserverOwnerUsername, threadColorStyle],
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
          {threadInfo.uiName}
        </div>
      </>
    );
  }, [threadHasNoAncestors, threadColorStyle, threadInfo.uiName]);

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
