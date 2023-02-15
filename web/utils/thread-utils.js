// @flow

import invariant from 'invariant';
import * as React from 'react';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import {
  createPendingThread,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { threadTypes } from 'lib/types/thread-types.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';

import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +activeChatThreadID: string,
};

function useThreadInfoForPossiblyPendingThread(props: Props): ThreadInfo {
  const { activeChatThreadID } = props;

  const isChatCreation =
    useSelector(state => state.navInfo.chatMode) === 'create';
  const selectedUserIDs = useSelector(state => state.navInfo.selectedUserList);
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userInfoInputArray: $ReadOnlyArray<AccountUserInfo> = React.useMemo(
    () => selectedUserIDs?.map(id => otherUserInfos[id]).filter(Boolean) ?? [],
    [otherUserInfos, selectedUserIDs],
  );
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  invariant(viewerID, 'should be set');
  const newThreadID = 'pending/new_thread';

  const pendingNewThread = React.useMemo(
    () => ({
      ...createPendingThread({
        viewerID,
        threadType: threadTypes.PRIVATE,
        name: 'New thread',
      }),
      id: newThreadID,
    }),
    [viewerID],
  );
  const pendingPrivateThread = React.useRef(
    createPendingThread({
      viewerID,
      threadType: threadTypes.PRIVATE,
    }),
  );
  const existingThreadInfoFinderForCreatingThread = useExistingThreadInfoFinder(
    pendingPrivateThread.current,
  );

  const baseThreadInfo = useSelector(state => {
    if (!activeChatThreadID) {
      return null;
    }
    return (
      threadInfoSelector(state)[activeChatThreadID] ??
      state.navInfo.pendingThread
    );
  });
  const existingThreadInfoFinder = useExistingThreadInfoFinder(baseThreadInfo);
  const threadInfo = React.useMemo(() => {
    if (isChatCreation) {
      if (userInfoInputArray.length === 0) {
        return pendingNewThread;
      }

      return existingThreadInfoFinderForCreatingThread({
        searching: true,
        userInfoInputArray,
      });
    }

    return existingThreadInfoFinder({
      searching: false,
      userInfoInputArray: [],
    });
  }, [
    existingThreadInfoFinder,
    existingThreadInfoFinderForCreatingThread,
    isChatCreation,
    userInfoInputArray,
    pendingNewThread,
  ]);
  invariant(threadInfo, 'ThreadInfo should be set');

  return threadInfo;
}

export { useThreadInfoForPossiblyPendingThread };
