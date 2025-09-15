// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import { useUsersSupportingProtocols } from 'lib/hooks/user-identities-hooks.js';
import { protocolNames } from 'lib/shared/protocol-names.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';
import { supportsFarcasterDCs } from 'lib/utils/services-utils.js';

import { useActiveThread } from '../navigation/nav-selectors.js';

type ProtocolSelectionProviderProps = {
  +children: React.Node,
};

function ProtocolSelectionProvider(
  props: ProtocolSelectionProviderProps,
): React.Node {
  const { children } = props;

  const [selectedProtocol, setSelectedProtocol] =
    React.useState<?ProtocolName>(null);
  const [isSearching, setSearching] = React.useState(false);
  const [userInfoInputArray, setUserInfoInputArray] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);

  const activeThread = useActiveThread();
  const isThreadPending = React.useMemo(
    () => activeThread && threadIsPending(activeThread),
    [activeThread],
  );

  React.useEffect(() => {
    if (!isSearching) {
      setSelectedProtocol(null);
      setUserInfoInputArray([]);
    }
  }, [isSearching, selectedProtocol]);

  const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
    useUsersSupportingProtocols(userInfoInputArray);

  const availableProtocols = React.useMemo(() => {
    const protocols: Array<ProtocolName> = [];
    if (
      (userInfoInputArray.length === 0 || allUsersSupportFarcasterThreads) &&
      supportsFarcasterDCs
    ) {
      protocols.push(protocolNames.FARCASTER_DC);
    }
    if (userInfoInputArray.length === 0 || allUsersSupportThickThreads) {
      protocols.push(protocolNames.COMM_DM);
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
    userInfoInputArray.length,
  ]);

  const contextValue = React.useMemo(
    () => ({
      selectedProtocol,
      setSelectedProtocol,
      availableProtocols,
      setUserInfoInput: setUserInfoInputArray,
      setSearching,
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
