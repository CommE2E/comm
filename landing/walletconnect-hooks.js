// @flow

import invariant from 'invariant';
import * as React from 'react';

type WalletConnectModalUpdate = {
  +state: 'open' | 'closed',
};
function useMonitorForWalletConnectModal(
  callback: WalletConnectModalUpdate => mixed,
) {
  const newModalAppeared = React.useCallback(
    mutationList => {
      for (const mutation of mutationList) {
        for (const addedNode of mutation.addedNodes) {
          if (
            addedNode instanceof HTMLElement &&
            addedNode.id === 'walletconnect-wrapper'
          ) {
            callback({ state: 'open' });
          }
        }
        for (const addedNode of mutation.removedNodes) {
          if (
            addedNode instanceof HTMLElement &&
            addedNode.id === 'walletconnect-wrapper'
          ) {
            callback({ state: 'closed' });
          }
        }
      }
    },
    [callback],
  );

  React.useEffect(() => {
    const observer = new MutationObserver(newModalAppeared);
    invariant(document.body, 'document.body should be set');
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
    };
  }, [newModalAppeared]);
}

export { useMonitorForWalletConnectModal };
