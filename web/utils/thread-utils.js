// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { useUsersSupportingProtocols } from 'lib/hooks/user-identities-hooks.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  createPendingThread,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils.js';
import { dmThreadProtocol } from 'lib/shared/threads/protocols/dm-thread-protocol.js';
import { keyserverThreadProtocol } from 'lib/shared/threads/protocols/keyserver-thread-protocol.js';
import { getProtocolByName } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
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
  selectedProtocol: ?ProtocolName,
): ?ThreadInfo {
  const { isChatCreation, selectedUserInfos } = useInfosForPendingThread();

  const loggedInUserInfo = useLoggedInUserInfo();
  invariant(loggedInUserInfo, 'loggedInUserInfo should be set');

  const pendingPrivateThread = React.useMemo(() => {
    const protocol = getProtocolByName(selectedProtocol) ?? dmThreadProtocol;

    return createPendingThread({
      viewerID: loggedInUserInfo.id,
      threadType: protocol.pendingThreadType(1),
      members: [loggedInUserInfo],
      // protocol: selectedProtocol,
    });
  }, [loggedInUserInfo, selectedProtocol]);

  const newThreadID = 'pending/new_thread';
  const pendingNewThread = React.useMemo(() => {
    const protocol = getProtocolByName(selectedProtocol) ?? dmThreadProtocol;
    return {
      ...createPendingThread({
        viewerID: loggedInUserInfo.id,
        threadType: protocol.pendingThreadType(1),
        members: [loggedInUserInfo],
        name: 'New thread',
      }),
      id: newThreadID,
    };
  }, [loggedInUserInfo, selectedProtocol]);

  const existingThreadInfoFinderForCreatingThread = useExistingThreadInfoFinder(
    pendingPrivateThread,
    selectedProtocol,
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

  const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
    useUsersSupportingProtocols(selectedUserInfos);

  const threadInfo = React.useMemo(() => {
    if (isChatCreation) {
      if (selectedUserInfos.length === 0) {
        return pendingNewThread;
      }

      return existingThreadInfoFinderForCreatingThread({
        searching: true,
        userInfoInputArray: selectedUserInfos,
        allUsersSupportThickThreads,
        allUsersSupportFarcasterThreads,
      });
    }

    return existingThreadInfoFinder({
      searching: false,
      userInfoInputArray: [],
      allUsersSupportThickThreads: true,
      allUsersSupportFarcasterThreads: true,
    });
  }, [
    allUsersSupportFarcasterThreads,
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
