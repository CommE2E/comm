// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import { useUsersSupportingProtocols } from 'lib/hooks/user-identities-hooks.js';
import { protocolNames } from 'lib/shared/protocol-names.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';
import { supportsFarcasterDCs } from 'lib/utils/services-utils.js';

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

  const [selectedProtocol, setSelectedProtocol] =
    React.useState<?ProtocolName>(null);

  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );

  const threadInfo = useThreadInfoForPossiblyPendingThread(
    activeChatThreadID,
    selectedProtocol,
  );
  const { isChatCreation, selectedUserInfos } = useInfosForPendingThread();

  const isThreadPending = React.useMemo(
    () => threadInfo && threadIsPending(threadInfo.id),
    [threadInfo],
  );

  React.useEffect(() => {
    if (!isChatCreation) {
      setSelectedProtocol(null);
    }
  }, [isChatCreation]);

  const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
    useUsersSupportingProtocols(selectedUserInfos);

  const availableProtocols = React.useMemo(() => {
    const protocols: Array<ProtocolName> = [];
    if (
      (selectedUserInfos.length === 0 || allUsersSupportFarcasterThreads) &&
      supportsFarcasterDCs
    ) {
      protocols.push(protocolNames.FARCASTER_DC);
    }
    if (selectedUserInfos.length === 0 || allUsersSupportThickThreads) {
      protocols.push(protocolNames.COMM_DM);
    }
    return protocols.filter(protocol => protocol !== selectedProtocol);
  }, [
    allUsersSupportFarcasterThreads,
    allUsersSupportThickThreads,
    selectedProtocol,
    selectedUserInfos.length,
  ]);

  React.useEffect(() => {
    if (selectedUserInfos.length === 0 || !isThreadPending) {
      return;
    }
    if (allUsersSupportFarcasterThreads && !allUsersSupportThickThreads) {
      setSelectedProtocol(protocolNames.FARCASTER_DC);
    } else if (
      !allUsersSupportFarcasterThreads &&
      allUsersSupportThickThreads
    ) {
      setSelectedProtocol(protocolNames.COMM_DM);
    }
  }, [
    allUsersSupportFarcasterThreads,
    allUsersSupportThickThreads,
    isThreadPending,
    selectedProtocol,
    selectedUserInfos.length,
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
