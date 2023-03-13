// @flow

import classnames from 'classnames';
import * as React from 'react';
import { ChevronRight } from 'react-feather';

import { useAncestorThreads } from 'lib/shared/ancestor-threads.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './chat-thread-ancestors.css';

type ThreadAncestorsProps = {
  +threadInfo: ThreadInfo,
};
function ThreadAncestors(props: ThreadAncestorsProps): React.Node {
  const { threadInfo } = props;

  const ancestorThreadsWithCommunity = useAncestorThreads(threadInfo);

  const community = ancestorThreadsWithCommunity[0] ?? threadInfo;
  const resolvedCommunity = useResolvedThreadInfo(community);

  const threadHasNoAncestors = community === threadInfo;

  const ancestorThreads = ancestorThreadsWithCommunity.slice(1);

  const chevronRight = React.useMemo(() => {
    if (threadHasNoAncestors) {
      return null;
    }
    return <ChevronRight size={20} className={css.chevronRight} />;
  }, [threadHasNoAncestors]);

  const { uiName } = useResolvedThreadInfo(threadInfo);

  const path = React.useMemo(() => {
    if (threadHasNoAncestors) {
      return null;
    }
    const ancestors = ancestorThreads.map(ancestor => (
      <ThreadAncestor threadInfo={ancestor} key={ancestor.id} />
    ));
    const chatNameClasses = classnames(css.ancestorName, css.chatName);
    return (
      <div className={css.ancestorThreadsContainer}>
        {ancestors}
        <div className={chatNameClasses}>{uiName}</div>
      </div>
    );
  }, [ancestorThreads, threadHasNoAncestors, uiName]);

  return (
    <div className={css.container}>
      <div className={css.communityName}>{resolvedCommunity.uiName}</div>
      {chevronRight}
      {path}
    </div>
  );
}

function ThreadAncestor(props: ThreadAncestorsProps): React.Node {
  const { uiName } = useResolvedThreadInfo(props.threadInfo);
  const chevronClasses = classnames(css.ancestorSeparator, css.chevronRight);
  return (
    <>
      <div className={css.ancestorName}>{uiName}</div>
      <ChevronRight size={12} className={chevronClasses} />
    </>
  );
}

export default ThreadAncestors;
