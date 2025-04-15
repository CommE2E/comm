// @flow

import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { type IdentitySearchAuthMessage } from '../types/identity-search/auth-message-types.js';
import { useSelector } from '../utils/redux-utils.js';

export function useGetIdentitySearchAuthMessage(): () => Promise<?IdentitySearchAuthMessage> {
  const loggedIn = useSelector(isLoggedIn);
  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const getAuthMetadata = identityContext.getAuthMetadata;

  return React.useCallback(async () => {
    if (!loggedIn || !commServicesAccessToken) {
      return null;
    }

    const authMetadata = await getAuthMetadata();

    if (
      !authMetadata.userID ||
      !authMetadata.deviceID ||
      !authMetadata.accessToken
    ) {
      console.log('Error getting auth message: authMetadata incomplete');
      return null;
    }

    return {
      type: 'IdentitySearchAuthMessage',
      userID: authMetadata?.userID,
      deviceID: authMetadata?.deviceID,
      accessToken: authMetadata?.accessToken,
    };
  }, [commServicesAccessToken, getAuthMetadata, loggedIn]);
}
