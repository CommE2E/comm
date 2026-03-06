// @flow

import * as React from 'react';

import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { getSearchingProtocol } from 'lib/shared/protocol-selection-utils.js';
import {
  createPendingThread,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils.js';
import { dmThreadProtocol } from 'lib/shared/threads/protocols/dm-thread-protocol.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ProtocolName } from 'lib/types/protocol-names.js';
import type { SelectedUserInfo } from 'lib/types/user-types.js';
import { useCurrentUserSupportsDCs } from 'lib/utils/farcaster-utils.js';

import { useSelector } from '../redux/redux-utils.js';

type InfosForPendingThread = {
  +isChatCreation: boolean,
  +selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
};

function useInfosForPendingThread(): InfosForPendingThread {
  const isChatCreation = useSelector(
    state => state.navInfo.chatMode === 'create',
  );
  const { selectedUserInfos = [] } = useProtocolSelection();
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
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();

  const pendingThread = React.useMemo(() => {
    if (!loggedInUserInfo) {
      return null;
    }
    return createPendingThread({
      viewerID: loggedInUserInfo.id,
      threadType: dmThreadProtocol.pendingThreadType(1),
      members: [loggedInUserInfo],
    });
  }, [loggedInUserInfo]);

  const newThreadID = 'pending/new_thread';
  const pendingNewThread = React.useMemo(() => {
    if (!loggedInUserInfo) {
      return null;
    }
    return {
      ...createPendingThread({
        viewerID: loggedInUserInfo.id,
        threadType: dmThreadProtocol.pendingThreadType(1),
        members: [loggedInUserInfo],
        name: 'New thread',
      }),
      id: newThreadID,
    };
  }, [loggedInUserInfo]);

  const existingThreadInfoFinderForCreatingThread =
    useExistingThreadInfoFinder(pendingThread);

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

  const threadInfo = React.useMemo(() => {
    if (isChatCreation) {
      if (selectedUserInfos.length === 0) {
        return pendingNewThread;
      }
      const searchingProtocol = getSearchingProtocol(
        selectedUserInfos,
        currentUserSupportsDCs,
        selectedProtocol,
      );

      return existingThreadInfoFinderForCreatingThread({
        searching: true,
        userInfoInputArray: selectedUserInfos,
        matchProtocol: selectedProtocol,
        pendingThreadProtocol: searchingProtocol,
      });
    }

    return existingThreadInfoFinder({ searching: false });
  }, [
    currentUserSupportsDCs,
    existingThreadInfoFinder,
    existingThreadInfoFinderForCreatingThread,
    isChatCreation,
    pendingNewThread,
    selectedProtocol,
    selectedUserInfos,
  ]);

  return threadInfo;
}

export { useThreadInfoForPossiblyPendingThread, useInfosForPendingThread };
