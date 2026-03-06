// @flow

import * as React from 'react';

import { ProtocolSelectionContext } from 'lib/contexts/protocol-selection-context.js';
import {
  getAvailableProtocolsForSearching,
  getSelectedProtocolForCompose,
} from 'lib/shared/protocol-selection-utils.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ProtocolName } from 'lib/types/protocol-names.js';
import type { SelectedUserInfo } from 'lib/types/user-types.js';
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
    $ReadOnlyArray<SelectedUserInfo>,
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

  const currentUserSupportsDCs = useCurrentUserSupportsDCs();

  const availableProtocols = React.useMemo(
    () =>
      getAvailableProtocolsForSearching(
        userInfoInputArray,
        currentUserSupportsDCs,
      ),
    [currentUserSupportsDCs, userInfoInputArray],
  );

  React.useEffect(() => {
    if (!isThreadPending) {
      return;
    }
    const nextSelectedProtocol = getSelectedProtocolForCompose(
      userInfoInputArray,
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
    userInfoInputArray,
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
