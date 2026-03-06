// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import {
  getAvailableProtocolsForSearching,
  getSelectedProtocolForCompose,
} from 'lib/shared/protocol-selection-utils.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ProtocolName } from 'lib/types/protocol-names.js';
import { useCurrentUserSupportsDCs } from 'lib/utils/farcaster-utils.js';

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

  const currentUserSupportsDCs = useCurrentUserSupportsDCs();

  const availableProtocols = React.useMemo(
    () =>
      getAvailableProtocolsForSearching(
        selectedUserInfos,
        currentUserSupportsDCs,
      ),
    [currentUserSupportsDCs, selectedUserInfos],
  );

  React.useEffect(() => {
    if (!isThreadPending) {
      return;
    }
    const nextSelectedProtocol = getSelectedProtocolForCompose(
      selectedUserInfos,
      currentUserSupportsDCs,
      selectedProtocol,
    );
    if (nextSelectedProtocol !== undefined) {
      setSelectedProtocol(nextSelectedProtocol);
    }
  }, [
    currentUserSupportsDCs,
    isThreadPending,
    selectedProtocol,
    selectedUserInfos,
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
