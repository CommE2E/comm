// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { ProtocolName } from '../shared/threads/thread-spec.js';
import type { AccountUserInfo } from '../types/user-types.js';

type ProtocolSelectionContextType = {
  +selectedProtocol: ?ProtocolName,
  +setSelectedProtocol: (?ProtocolName) => mixed,
  +availableProtocols: $ReadOnlyArray<ProtocolName>,
  +setUserInfoInput?: ($ReadOnlyArray<AccountUserInfo>) => mixed,
  +setSearching?: boolean => mixed,
};

const ProtocolSelectionContext: React.Context<?ProtocolSelectionContextType> =
  React.createContext<?ProtocolSelectionContextType>(null);

function useProtocolSelection(): ProtocolSelectionContextType {
  const context = React.useContext(ProtocolSelectionContext);
  invariant(
    context,
    'useProtocolSelection must be used within a ProtocolSelectionProvider',
  );
  return context;
}

export type { ProtocolSelectionContextType };
export { ProtocolSelectionContext, useProtocolSelection };
