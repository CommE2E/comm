// @flow

import * as React from 'react';

import { setAccessTokenActionType } from 'lib/actions/user-actions.js';
import type { UserLoginResponse } from 'lib/types/identity-service-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { getCommServicesAuthMetadataEmitter } from '../event-emitters/csa-auth-metadata-emitter.js';
import { commCoreModule } from '../native-modules.js';

function AccessTokenHandler(): React.Node {
  const dispatch = useDispatch();

  React.useEffect(() => {
    void (async () => {
      const { accessToken } =
        await commCoreModule.getCommServicesAuthMetadata();
      dispatch({
        type: setAccessTokenActionType,
        payload: accessToken ?? null,
      });
    })();
  }, [dispatch]);

  React.useEffect(() => {
    const metadataEmitter = getCommServicesAuthMetadataEmitter();
    const subscription = metadataEmitter.addListener(
      'commServicesAuthMetadata',
      (authMetadata: UserLoginResponse) => {
        dispatch({
          type: setAccessTokenActionType,
          payload: authMetadata.accessToken,
        });
      },
    );
    return () => subscription.remove();
  }, [dispatch]);

  return null;
}

export default AccessTokenHandler;
