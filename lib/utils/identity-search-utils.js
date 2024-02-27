// @flow

import invariant from 'invariant';
import * as React from 'react';

import { usingCommServicesAccessToken } from './services-utils.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { type IdentitySearchAuthMessage } from '../types/identity-search/auth-message-types.js';

export function useGetIdentitySearchAuthMessage(): () => Promise<?IdentitySearchAuthMessage> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const getAuthMetadata = identityContext.getAuthMetadata;

  return React.useCallback(async () => {
    if (!getAuthMetadata || !usingCommServicesAccessToken) {
      return null;
    }

    const authMetadata = await getAuthMetadata();

    if (
      !authMetadata.userID ||
      !authMetadata.deviceID ||
      !authMetadata.accessToken
    ) {
      throw new Error('Auth metadata is incomplete');
    }

    return {
      type: 'IdentitySearchAuthMessage',
      userID: authMetadata?.userID,
      deviceID: authMetadata?.deviceID,
      accessToken: authMetadata?.accessToken,
    };
  }, [getAuthMetadata]);
}
