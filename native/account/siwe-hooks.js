// @flow

import * as React from 'react';

import { siweAuth, siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

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
): SIWEServerCallParams => Promise<void> {
  const { onFailure } = params;

  const siweAuthCall = useServerCall(siweAuth);

  const callSIWE = React.useCallback(
    async (message, signature, extraInfo) => {
      try {
        return await siweAuthCall({
          message,
          signature,
          ...extraInfo,
        });
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

  const callInitialNotificationsEncryptedMessage =
    useInitialNotificationsEncryptedMessage();

  const dispatchActionPromise = useDispatchActionPromise();
  return React.useCallback(
    async ({ message, signature }) => {
      const extraInfo = await logInExtraInfo();
      const initialNotificationsEncryptedMessage =
        await callInitialNotificationsEncryptedMessage();

      dispatchActionPromise(
        siweAuthActionTypes,
        callSIWE(message, signature, {
          ...extraInfo,
          initialNotificationsEncryptedMessage,
        }),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    },
    [
      logInExtraInfo,
      dispatchActionPromise,
      callSIWE,
      callInitialNotificationsEncryptedMessage,
    ],
  );
}

export { useSIWEServerCall };
