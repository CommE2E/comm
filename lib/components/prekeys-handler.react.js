// @flow

import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { getConfig } from '../utils/config.js';
import { useSelector } from '../utils/redux-utils.js';

// Time after which rotation is started
const PREKEY_ROTATION_TIMEOUT = 3 * 1000; // in milliseconds

function PrekeysHandler(): null {
  const loggedIn = useSelector(isLoggedIn);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  React.useEffect(() => {
    if (!loggedIn) {
      return undefined;
    }

    const timeoutID = setTimeout(async () => {
      try {
        const authMetadata = await identityContext.getAuthMetadata();
        if (!authMetadata) {
          return;
        }
        const { olmAPI } = getConfig();
        await olmAPI.validateAndUploadPrekeys(authMetadata);
      } catch (e) {
        console.log('Prekey validation error: ', e.message);
      }
    }, PREKEY_ROTATION_TIMEOUT);

    return () => clearTimeout(timeoutID);
  }, [identityContext, loggedIn]);

  return null;
}

export default PrekeysHandler;
