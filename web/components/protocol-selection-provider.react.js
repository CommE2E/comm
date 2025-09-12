// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import { useUsersSupportingProtocols } from 'lib/hooks/user-identities-hooks.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';

import { useSelector } from '../redux/redux-utils.js';
import {
  useInfosForPendingThread,
  useThreadInfoForPossiblyPendingThread,
} from '../utils/thread-utils.js';

type ProtocolSelectionProviderProps = {
  +children: React.Node,
};

function ProtocolSelectionProvider(
  props: ProtocolSelectionProviderProps,
): React.Node {
  const { children } = props;

  const { isChatCreation, selectedUserInfos: userInfoInputArray } =
    useInfosForPendingThread();

  const [selectedProtocol, setSelectedProtocol] =
    React.useState<?ProtocolName>(null);
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const threadInfo = useThreadInfoForPossiblyPendingThread(
    activeChatThreadID,
    selectedProtocol,
  );

  const isThreadPending = React.useMemo(
    () => threadInfo && threadIsPending(threadInfo.id),
    [threadInfo],
  );

  React.useEffect(() => {
    if (!isChatCreation) {
      setSelectedProtocol(null);
    }
  }, [isChatCreation]);

  React.useEffect(
    () => console.log('IN CONTEXT', selectedProtocol),
    [selectedProtocol],
  );

  const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
    useUsersSupportingProtocols(userInfoInputArray);

  const availableProtocols = React.useMemo(() => {
    const protocols = [];

    if (userInfoInputArray.length === 0 || allUsersSupportFarcasterThreads) {
      protocols.push('Farcaster DC');
    }
    if (userInfoInputArray.length === 0 || allUsersSupportThickThreads) {
      protocols.push('Comm DM');
    }

    return protocols.filter(protocol => protocol !== selectedProtocol);
  }, [
    allUsersSupportFarcasterThreads,
    allUsersSupportThickThreads,
    selectedProtocol,
    userInfoInputArray.length,
  ]);

  React.useEffect(() => {
    if (userInfoInputArray.length === 0 || !isThreadPending) {
      return;
    }
    if (allUsersSupportFarcasterThreads && !allUsersSupportThickThreads) {
      console.log('forcing dc');
      setSelectedProtocol('Farcaster DC');
    } else if (
      !allUsersSupportFarcasterThreads &&
      allUsersSupportThickThreads
    ) {
      console.log('forcing dm');
      setSelectedProtocol('Comm DM');
    }
  }, [
    allUsersSupportFarcasterThreads,
    allUsersSupportThickThreads,
    isThreadPending,
    selectedProtocol,
    userInfoInputArray.length,
  ]);

  const contextValue = React.useMemo(
    () => ({
      selectedProtocol,
      setSelectedProtocol,
      availableProtocols,
    }),
    [availableProtocols, selectedProtocol],
  );

  return (
    <ProtocolSelectionContext.Provider value={contextValue}>
      {children}
    </ProtocolSelectionContext.Provider>
  );
}

export { ProtocolSelectionProvider };
