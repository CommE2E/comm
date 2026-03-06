// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { ProtocolName } from '../types/protocol-names.js';
import type { SelectedUserInfo } from '../types/user-types.js';

type ProtocolSelectionContextType = {
  +selectedProtocol: ?ProtocolName,
  +setSelectedProtocol: (?ProtocolName) => mixed,
  +availableProtocols: $ReadOnlyArray<ProtocolName>,
  +selectedUserInfos?: $ReadOnlyArray<SelectedUserInfo>,
  +setUserInfoInput: ($ReadOnlyArray<SelectedUserInfo>) => mixed,
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
