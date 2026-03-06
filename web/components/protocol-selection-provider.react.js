// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import {
  getAvailableProtocolsForSearching,
  getSelectedProtocolForCompose,
} from 'lib/shared/protocol-selection-utils.js';
import type { ProtocolName } from 'lib/types/protocol-names.js';
import { useCurrentUserSupportsDCs } from 'lib/utils/farcaster-utils.js';

import { useSelector } from '../redux/redux-utils.js';
import { useSelectedUserInfosWithSupportedProtocols } from '../utils/protocol-selection-hooks.js';

type ProtocolSelectionProviderProps = {
  +children: React.Node,
};

function ProtocolSelectionProvider(
  props: ProtocolSelectionProviderProps,
): React.Node {
  const { children } = props;

  const [selectedProtocol, setSelectedProtocol] =
    React.useState<?ProtocolName>(null);

  const isChatCreation = useSelector(
    state => state.navInfo.chatMode === 'create',
  );
  const rawSelectedUserInfos = useSelector(
    state => state.navInfo.selectedUserList ?? [],
  );
  const { selectedUserInfos, setUserInfoInput } =
    useSelectedUserInfosWithSupportedProtocols(
      rawSelectedUserInfos,
      isChatCreation,
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
    if (!isChatCreation) {
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
    isChatCreation,
    selectedProtocol,
    selectedUserInfos,
  ]);

  const contextValue = React.useMemo(
    () => ({
      selectedProtocol,
      setSelectedProtocol,
      availableProtocols,
      selectedUserInfos,
      setUserInfoInput,
    }),
    [availableProtocols, selectedProtocol, selectedUserInfos, setUserInfoInput],
  );

  return (
    <ProtocolSelectionContext.Provider value={contextValue}>
      {children}
    </ProtocolSelectionContext.Provider>
  );
}

export { ProtocolSelectionProvider };
