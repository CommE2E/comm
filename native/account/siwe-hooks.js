// @flow

import * as React from 'react';

import {
  identityRegisterActionTypes,
  useIdentityWalletRegister,
} from 'lib/actions/user-actions.js';
import type { IdentityWalletRegisterInput } from 'lib/types/siwe-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

function useIdentityWalletRegisterCall(): IdentityWalletRegisterInput => Promise<void> {
  const identityWalletRegister = useIdentityWalletRegister();
  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async ({ address, message, signature, fid }) => {
      const siwePromise = identityWalletRegister(
        address,
        message,
        signature,
        fid,
      );
      void dispatchActionPromise(identityRegisterActionTypes, siwePromise);

      await siwePromise;
    },
    [dispatchActionPromise, identityWalletRegister],
  );
}

type PanelState = 'closed' | 'opening' | 'open' | 'closing';

function useSIWEPanelState(): {
  +panelState: PanelState,
  +openPanel: () => void,
  +onPanelClosed: () => void,
  +onPanelClosing: () => void,
  +siwePanelSetLoading: (loading: boolean) => void,
} {
  const [panelState, setPanelState] = React.useState<PanelState>('closed');

  const openPanel = React.useCallback(() => {
    setPanelState('opening');
  }, []);

  const onPanelClosed = React.useCallback(() => {
    setPanelState('closed');
  }, []);
  const onPanelClosing = React.useCallback(() => {
    setPanelState('closing');
  }, []);

  const siwePanelSetLoading = React.useCallback(
    (loading: boolean) => {
      if (panelState === 'closing' || panelState === 'closed') {
        return;
      }
      setPanelState(loading ? 'opening' : 'open');
    },
    [panelState],
  );

  return React.useMemo(
    () => ({
      panelState,
      openPanel,
      onPanelClosed,
      onPanelClosing,
      siwePanelSetLoading,
    }),
    [panelState, openPanel, onPanelClosed, onPanelClosing, siwePanelSetLoading],
  );
}

export { useIdentityWalletRegisterCall, useSIWEPanelState };
