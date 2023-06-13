// @flow

import * as React from 'react';

import { siweAuth, siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import type { CallServerEndpointOptions } from 'lib/utils/call-server-endpoint.js';

import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import { useInitialNotificationsEncryptedMessage } from '../utils/crypto-utils.js';

type SIWEServerCallParams = {
  +message: string,
  +signature: string,
  ...
};
type UseSIWEServerCallParams = {
  +onFailure: () => mixed,
};
function useSIWEServerCall(
  params: UseSIWEServerCallParams,
): (SIWEServerCallParams, ?CallServerEndpointOptions) => Promise<void> {
  const { onFailure } = params;

  const siweAuthCall = useServerCall(siweAuth);

  const callSIWE = React.useCallback(
    async (message, signature, extraInfo, options) => {
      try {
        return await siweAuthCall(
          {
            message,
            signature,
            ...extraInfo,
          },
          options,
        );
      } catch (e) {
        onFailure();
        throw e;
      }
    },
    [onFailure, siweAuthCall],
  );

  const navContext = React.useContext(NavContext);
  const logInExtraInfo = useSelector(state =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const getInitialNotificationsEncryptedMessage =
    useInitialNotificationsEncryptedMessage();

  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async ({ message, signature }, options) => {
      const extraInfo = await logInExtraInfo();
      const initialNotificationsEncryptedMessage =
        await getInitialNotificationsEncryptedMessage(options);

      const siwePromise = callSIWE(
        message,
        signature,
        {
          ...extraInfo,
          initialNotificationsEncryptedMessage,
        },
        options,
      );

      dispatchActionPromise(
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

export { useSIWEServerCall };
