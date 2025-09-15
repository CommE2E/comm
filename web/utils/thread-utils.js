// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  createPendingThread,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils.js';
import { dmThreadProtocol } from 'lib/shared/threads/protocols/dm-thread-protocol.js';
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

  const pendingThread = React.useMemo(() => {
    const protocol = getProtocolByName(selectedProtocol) ?? dmThreadProtocol;
    return createPendingThread({
      viewerID: loggedInUserInfo.id,
      threadType: protocol.pendingThreadType(1),
      members: [loggedInUserInfo],
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
    pendingThread,
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
  const existingThreadInfoFinder = useExistingThreadInfoFinder(
    baseThreadInfo,
    selectedProtocol,
  );

  const threadInfo = React.useMemo(() => {
    if (isChatCreation) {
      if (selectedUserInfos.length === 0) {
        return pendingNewThread;
      }

      return existingThreadInfoFinderForCreatingThread({
        searching: true,
        userInfoInputArray: selectedUserInfos,
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
    pendingNewThread,
    selectedUserInfos,
  ]);

  return threadInfo;
}

export { useThreadInfoForPossiblyPendingThread, useInfosForPendingThread };
