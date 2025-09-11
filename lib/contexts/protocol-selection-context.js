// @flow

import * as React from 'react';

import type { ProtocolName } from '../shared/threads/thread-spec.js';
import type { AccountUserInfo } from '../types/user-types.js';

type ProtocolSelectionContextType = {
  +selectedProtocol: ?ProtocolName,
  +setSelectedProtocol: (?ProtocolName) => void,
  +availableProtocols: $ReadOnlyArray<ProtocolName>,
  +setUserInfoInput: ($ReadOnlyArray<AccountUserInfo>) => void,
  +setIsSearching: boolean => void,
  +setIsThreadPending: boolean => void,
};

const ProtocolSelectionContext: React.Context<?ProtocolSelectionContextType> =
  React.createContext<?ProtocolSelectionContextType>(null);

function useProtocolSelection(): ProtocolSelectionContextType {
  const context = React.useContext(ProtocolSelectionContext);
  if (!context) {
    throw new Error(
      'useProtocolSelection must be used within a ProtocolSelectionProvider',
    );
  }
  return context;
}

export type { ProtocolSelectionContextType };
export { ProtocolSelectionContext, useProtocolSelection };