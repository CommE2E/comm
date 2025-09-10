// @flow

import * as React from 'react';

import { useUsersSupportingProtocols } from '../hooks/user-identities-hooks.js';
import type { ProtocolName } from '../shared/threads/thread-spec.js';
import type { AccountUserInfo, UserListItem } from '../types/user-types.js';

type ProtocolSelectionContextType = {
  +selectedProtocol: ?ProtocolName,
  +setSelectedProtocol: (?ProtocolName) => void,
  +availableProtocols: $ReadOnlyArray<ProtocolName>,
  +setUserInfoInput: ($ReadOnlyArray<AccountUserInfo>) => void,
  +setIsSearching: boolean => void,
};

const ProtocolSelectionContext: React.Context<?ProtocolSelectionContextType> =
  React.createContext<?ProtocolSelectionContextType>(null);

type ProtocolSelectionProviderProps = {
  +children: React.Node,
};

function ProtocolSelectionProvider(
  props: ProtocolSelectionProviderProps,
): React.Node {
  const { children } = props;

  const [selectedProtocol, setSelectedProtocol] =
    React.useState<?ProtocolName>(null);
  const [userInfoInputArray, setUserInfoInputArray] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);
  const [isSearching, setIsSearching] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isSearching) {
      setSelectedProtocol(false);
      setUserInfoInputArray([]);
    }
  }, [isSearching, selectedProtocol]);

  //TODO: this should be called only here
  const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
    useUsersSupportingProtocols(userInfoInputArray);

  // const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
  //   React.useMemo(() => {
  //     return {
  //       allUsersSupportThickThreads: userInfoInputArray.every(user =>
  //         user.supportedProtocols.includes('Comm DM'),
  //       ),
  //       allUsersSupportFarcasterThreads: userInfoInputArray.every(user =>
  //         user.supportedProtocols.includes('Farcaster DC'),
  //       ),
  //     };
  //   }, [userInfoInputArray]);

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

  // React.useEffect(() => {
  //   if (userInfoInputArray.length === 0) {
  //     return;
  //   }
  //   if (allUsersSupportFarcasterThreads && !allUsersSupportThickThreads) {
  //     setSelectedProtocol('Farcaster DC');
  //   } else if (
  //     !allUsersSupportFarcasterThreads &&
  //     allUsersSupportThickThreads
  //   ) {
  //     setSelectedProtocol('Comm DM');
  //   }
  // }, [
  //   allUsersSupportFarcasterThreads,
  //   allUsersSupportThickThreads,
  //   selectedProtocol,
  //   userInfoInputArray.length,
  // ]);

  // const filteredUserInfoInputArray = React.useMemo(() => {
  //   if (!selectedProtocol) {
  //     return userInfoInputArray;
  //   }
  //   return userInfoInputArray.filter(user =>
  //     user.supportedProtocols.includes(selectedProtocol),
  //   );
  // }, [selectedProtocol, userInfoInputArray]);

  const contextValue = React.useMemo(
    () => ({
      selectedProtocol,
      setSelectedProtocol,
      availableProtocols,
      setUserInfoInput: setUserInfoInputArray,
      setIsSearching,
    }),
    [availableProtocols, selectedProtocol],
  );

  return (
    <ProtocolSelectionContext.Provider value={contextValue}>
      {children}
    </ProtocolSelectionContext.Provider>
  );
}

function useProtocolSelection(): ProtocolSelectionContextType {
  const context = React.useContext(ProtocolSelectionContext);
  if (!context) {
    throw new Error(
      'useProtocolSelection must be used within a ProtocolSelectionProvider',
    );
  }
  return context;
}

export { ProtocolSelectionProvider, useProtocolSelection };
