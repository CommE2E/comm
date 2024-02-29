// @flow

import invariant from 'invariant';
import * as React from 'react';

import { usingCommServicesAccessToken } from './services-utils.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { type IdentitySearchAuthMessage } from '../types/identity-search/auth-message-types.js';
import { useSelector } from '../utils/redux-utils.js';

export function useGetIdentitySearchAuthMessage(): () => Promise<?IdentitySearchAuthMessage> {
  const loggedIn = useSelector(isLoggedIn);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const getAuthMetadata = identityContext.getAuthMetadata;

  return React.useCallback(async () => {
    if (!loggedIn || !usingCommServicesAccessToken) {
      return null;
    }

    const authMetadata = await getAuthMetadata();

    if (
      !authMetadata.userID ||
      !authMetadata.deviceID ||
      !authMetadata.accessToken
    ) {
      console.log('Error getting authMetadata: authMetadata incomplete');
      return null;
    }

    return {
      type: 'IdentitySearchAuthMessage',
      userID: authMetadata?.userID,
      deviceID: authMetadata?.deviceID,
      accessToken: authMetadata?.accessToken,
    };
  }, [getAuthMetadata, loggedIn]);
}
