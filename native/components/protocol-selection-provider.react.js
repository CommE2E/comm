// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import { useUsersSupportingProtocols } from 'lib/hooks/user-identities-hooks.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import { protocolNames, type ProtocolName } from 'lib/types/protocol-names.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';
import { useCurrentUserSupportsDCs } from 'lib/utils/farcaster-utils.js';

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

  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const canUseFarcasterThreads =
    (userInfoInputArray.length === 0 || allUsersSupportFarcasterThreads) &&
    currentUserSupportsDCs;

  const availableProtocols = React.useMemo(() => {
    const protocols: Array<ProtocolName> = [];
    if (canUseFarcasterThreads) {
      protocols.push(protocolNames.FARCASTER_DC);
    }
    if (userInfoInputArray.length === 0 || allUsersSupportThickThreads) {
      protocols.push(protocolNames.COMM_DM);
    }
    return protocols.filter(protocol => protocol !== selectedProtocol);
  }, [
    canUseFarcasterThreads,
    allUsersSupportThickThreads,
    selectedProtocol,
    userInfoInputArray.length,
  ]);

  React.useEffect(() => {
    if (!isThreadPending) {
      return;
    }
    if (userInfoInputArray.length === 0) {
      setSelectedProtocol(null);
    } else if (
      canUseFarcasterThreads &&
      allUsersSupportFarcasterThreads &&
      !allUsersSupportThickThreads
    ) {
      setSelectedProtocol(protocolNames.FARCASTER_DC);
    } else if (!canUseFarcasterThreads && allUsersSupportThickThreads) {
      setSelectedProtocol(protocolNames.COMM_DM);
    } else if (!canUseFarcasterThreads && !allUsersSupportThickThreads) {
      setSelectedProtocol(protocolNames.KEYSERVER);
    }
  }, [
    canUseFarcasterThreads,
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
