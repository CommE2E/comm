// @flow

import * as React from 'react';

import {
  legacySiweAuth,
  legacySiweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import {
  identityRegisterActionTypes,
  useIdentityWalletRegister,
} from 'lib/actions/user-actions.js';
import type { CallSingleKeyserverEndpointOptions } from 'lib/keyserver-conn/call-single-keyserver-endpoint.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import type {
  LegacyLogInStartingPayload,
  LegacyLogInExtraInfo,
} from 'lib/types/account-types.js';
import type { IdentityWalletRegisterInput } from 'lib/types/siwe-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { useSelector } from '../redux/redux-utils.js';
import { nativeLegacyLogInExtraInfoSelector } from '../selectors/account-selectors.js';

type SIWEServerCallParams = {
  +message: string,
  +signature: string,
  +doNotRegister?: boolean,
  ...
};
function useLegacySIWEServerCall(): (
  SIWEServerCallParams,
  ?CallSingleKeyserverEndpointOptions,
) => Promise<void> {
  const legacySiweAuthCall = useLegacyAshoatKeyserverCall(legacySiweAuth);

  const callSIWE = React.useCallback(
    (
      message: string,
      signature: string,
      extraInfo: $ReadOnly<{
        ...LegacyLogInExtraInfo,
        +doNotRegister?: boolean,
      }>,
      callSingleKeyserverEndpointOptions: ?CallSingleKeyserverEndpointOptions,
    ) =>
      legacySiweAuthCall(
        {
          message,
          signature,
          ...extraInfo,
        },
        callSingleKeyserverEndpointOptions,
      ),
    [legacySiweAuthCall],
  );

  const legacyLogInExtraInfo = useSelector(nativeLegacyLogInExtraInfoSelector);

  const getInitialNotificationsEncryptedMessage =
    useInitialNotificationsEncryptedMessage(authoritativeKeyserverID);

  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async (
      { message, signature, doNotRegister },
      callSingleKeyserverEndpointOptions,
    ) => {
      const extraInfo = await legacyLogInExtraInfo();
      const initialNotificationsEncryptedMessage =
        await getInitialNotificationsEncryptedMessage({
          callSingleKeyserverEndpointOptions,
        });

      const siwePromise = callSIWE(
        message,
        signature,
        {
          ...extraInfo,
          initialNotificationsEncryptedMessage,
          doNotRegister,
        },
        callSingleKeyserverEndpointOptions,
      );

      void dispatchActionPromise(
        legacySiweAuthActionTypes,
        siwePromise,
        undefined,
        ({
          calendarQuery: extraInfo.calendarQuery,
        }: LegacyLogInStartingPayload),
      );

      await siwePromise;
    },
    [
      legacyLogInExtraInfo,
      dispatchActionPromise,
      callSIWE,
      getInitialNotificationsEncryptedMessage,
    ],
  );
}

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

  return {
    panelState,
    openPanel,
    onPanelClosed,
    onPanelClosing,
    siwePanelSetLoading,
  };
}

export {
  useLegacySIWEServerCall,
  useIdentityWalletRegisterCall,
  useSIWEPanelState,
};
