// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { useUsersSupportThickThreads } from 'lib/hooks/user-identities-hooks.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  createPendingThread,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';

import { useSelector } from '../redux/redux-utils.js';

type InfosForPendingThread = {
  +isChatCreation: boolean,
  +selectedUserInfos: $ReadOnlyArray<AccountUserInfo>,
};

function useInfosForPendingThread(): InfosForPendingThread {
  const isChatCreation = useSelector(
    state => state.navInfo.chatMode === 'create',
  );
  const selectedUserInfos = useSelector(
    state => state.navInfo.selectedUserList ?? [],
  );
  return {
    isChatCreation,
    selectedUserInfos,
  };
}

function useThreadInfoForPossiblyPendingThread(
  activeChatThreadID: ?string,
): ?ThreadInfo {
  const { isChatCreation, selectedUserInfos } = useInfosForPendingThread();

  const loggedInUserInfo = useLoggedInUserInfo();
  invariant(loggedInUserInfo, 'loggedInUserInfo should be set');

  const pendingPrivateThread = React.useRef(
    createPendingThread({
      viewerID: loggedInUserInfo.id,
      threadType: threadTypes.PRIVATE,
      members: [loggedInUserInfo],
    }),
  );

  const newThreadID = 'pending/new_thread';
  const pendingNewThread = React.useMemo(
    () => ({
      ...createPendingThread({
        viewerID: loggedInUserInfo.id,
        threadType: threadTypes.PRIVATE,
        members: [loggedInUserInfo],
        name: 'New thread',
      }),
      id: newThreadID,
    }),
    [loggedInUserInfo],
  );
  const existingThreadInfoFinderForCreatingThread = useExistingThreadInfoFinder(
    pendingPrivateThread.current,
  );

  const baseThreadInfo = useSelector(state => {
    if (activeChatThreadID) {
      const activeThreadInfo = threadInfoSelector(state)[activeChatThreadID];
      if (activeThreadInfo) {
        return activeThreadInfo;
      }
    }
    return state.navInfo.pendingThread;
  });
  const existingThreadInfoFinder = useExistingThreadInfoFinder(baseThreadInfo);
  const checkUsersThickThreadSupport = useUsersSupportThickThreads();

  const [allUsersSupportThickThreads, setAllUsersSupportThickThreads] =
    React.useState(false);
  React.useEffect(() => {
    void (async () => {
      const usersSupportingThickThreads = await checkUsersThickThreadSupport(
        selectedUserInfos.map(user => user.id),
      );
      setAllUsersSupportThickThreads(
        selectedUserInfos.every(userInfo =>
          usersSupportingThickThreads.get(userInfo.id),
        ),
      );
    })();
  }, [checkUsersThickThreadSupport, selectedUserInfos]);

  const threadInfo = React.useMemo(() => {
    if (isChatCreation) {
      if (selectedUserInfos.length === 0) {
        return pendingNewThread;
      }

      return existingThreadInfoFinderForCreatingThread({
        searching: true,
        userInfoInputArray: selectedUserInfos,
        allUsersSupportThickThreads,
      });
    }

    return existingThreadInfoFinder({
      searching: false,
      userInfoInputArray: [],
      allUsersSupportThickThreads: true,
    });
  }, [
    allUsersSupportThickThreads,
    existingThreadInfoFinder,
    existingThreadInfoFinderForCreatingThread,
    isChatCreation,
    pendingNewThread,
    selectedUserInfos,
  ]);

  return threadInfo;
}

export { useThreadInfoForPossiblyPendingThread, useInfosForPendingThread };
