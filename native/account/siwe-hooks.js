// @flow

import * as React from 'react';

import { siweAuth, siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import type {
  LogInStartingPayload,
  LogInExtraInfo,
} from 'lib/types/account-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import type { CallSingleKeyserverEndpointOptions } from 'lib/utils/call-single-keyserver-endpoint.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
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
        await getInitialNotificationsEncryptedMessage(
          authoritativeKeyserverID,
          {
            callSingleKeyserverEndpointOptions,
          },
        );

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

export { useLegacySIWEServerCall };
