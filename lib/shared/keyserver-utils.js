// @flow

import * as React from 'react';

import {
  getVersion,
  getVersionActionTypes,
} from '../actions/device-actions.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from '../utils/action-utils.js';

function useIsKeyserverURLValid(keyserverURL: string): () => Promise<boolean> {
  const serverCallParamOverride = React.useMemo(
    () => ({
      urlPrefix: keyserverURL,
    }),
    [keyserverURL],
  );

  console.log(serverCallParamOverride);

  const getVersionCall = useServerCall(getVersion, serverCallParamOverride);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(async () => {
    const getVersionPromise = getVersionCall();
    dispatchActionPromise(getVersionActionTypes, getVersionPromise);

    // We don't care about the result; just need to make sure this doesn't throw
    try {
      await getVersionPromise;
      return true;
    } catch (e) {
      return false;
    }
  }, [dispatchActionPromise, getVersionCall]);
}

export { useIsKeyserverURLValid };
