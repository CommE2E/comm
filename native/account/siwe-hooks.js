// @flow

import * as React from 'react';

import { siweAuth, siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import {
  identityLogInActionTypes,
  useIdentityWalletLogIn,
  identityRegisterActionTypes,
  useIdentityWalletRegister,
} from 'lib/actions/user-actions.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import type {
  LogInStartingPayload,
  LogInExtraInfo,
} from 'lib/types/account-types.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import type { CallSingleKeyserverEndpointOptions } from 'lib/utils/call-single-keyserver-endpoint.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import { useSelector } from '../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import { nativeNotificationsSessionCreator } from '../utils/crypto-utils.js';

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
  const siweAuthCall = useLegacyAshoatKeyserverCall(siweAuth);

  const callSIWE = React.useCallback(
    (
      message: string,
      signature: string,
      extraInfo: $ReadOnly<{ ...LogInExtraInfo, +doNotRegister?: boolean }>,
      callSingleKeyserverEndpointOptions: ?CallSingleKeyserverEndpointOptions,
    ) =>
      siweAuthCall(
        {
          message,
          signature,
          ...extraInfo,
        },
        callSingleKeyserverEndpointOptions,
      ),
    [siweAuthCall],
  );

  const logInExtraInfo = useSelector(nativeLogInExtraInfoSelector);

  const getInitialNotificationsEncryptedMessage =
    useInitialNotificationsEncryptedMessage(nativeNotificationsSessionCreator);

  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async (
      { message, signature, doNotRegister },
      callSingleKeyserverEndpointOptions,
    ) => {
      const extraInfo = await logInExtraInfo();
      const initialNotificationsEncryptedMessage =
        await getInitialNotificationsEncryptedMessage(ashoatKeyserverID, {
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
        siweAuthActionTypes,
        siwePromise,
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );

      await siwePromise;
    },
    [
      logInExtraInfo,
      dispatchActionPromise,
      callSIWE,
      getInitialNotificationsEncryptedMessage,
    ],
  );
}

function useIdentityWalletLogInCall(): SIWEResult => Promise<void> {
  const identityWalletLogIn = useIdentityWalletLogIn();
  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async ({ address, message, signature }) => {
      const siwePromise = identityWalletLogIn(address, message, signature);
      void dispatchActionPromise(identityLogInActionTypes, siwePromise);

      await siwePromise;
    },
    [dispatchActionPromise, identityWalletLogIn],
  );
}

function useIdentityWalletRegisterCall(): SIWEResult => Promise<void> {
  const identityWalletRegister = useIdentityWalletRegister();
  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async ({ address, message, signature }) => {
      const siwePromise = identityWalletRegister(address, message, signature);
      void dispatchActionPromise(identityRegisterActionTypes, siwePromise);

      await siwePromise;
    },
    [dispatchActionPromise, identityWalletRegister],
  );
}

export {
  useLegacySIWEServerCall,
  useIdentityWalletLogInCall,
  useIdentityWalletRegisterCall,
};
