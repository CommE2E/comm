// @flow

import * as React from 'react';

import { relativeMemberInfoSelectorForMembersOfThread } from '../selectors/user-selectors';
import { stringForUser } from '../shared/user-utils';
import type { ThreadInfo } from '../types/thread-types';
import { useSelector } from '../utils/redux-utils';
import { pluralizeAndTrim } from '../utils/text-utils';

function useInlineSidebarText(
  threadInfo: ?ThreadInfo,
): {
  sendersText: string,
  repliesText: string,
} {
  const repliesCount = threadInfo?.repliesCount || 1;
  const repliesText = `${repliesCount} ${
    repliesCount > 1 ? 'replies' : 'reply'
  }`;

  const threadMembers = useSelector(
    relativeMemberInfoSelectorForMembersOfThread(threadInfo?.id),
  );
  const sendersText = React.useMemo(() => {
    const senders = threadMembers
      .filter(member => member.isSender)
      .map(stringForUser);
    return senders.length > 0 ? `${pluralizeAndTrim(senders, 25)} sent ` : '';
  }, [threadMembers]);

  return React.useMemo(() => {
    if (!threadInfo) {
      return { sendersText: '', repliesText: '' };
    }
    return {
      sendersText,
      repliesText,
    };
  }, [threadInfo, sendersText, repliesText]);
}

export default useInlineSidebarText;
