// @flow

import * as React from 'react';

import {
  useGetVersion,
  getVersionActionTypes,
} from '../actions/device-actions.js';
import { useDispatchActionPromise } from '../utils/action-utils.js';

function useIsKeyserverURLValid(keyserverURL?: string): () => Promise<boolean> {
  const serverCallParamOverride = React.useMemo(() => {
    if (!keyserverURL) {
      return undefined;
    }

    return {
      keyserverInfos: {
        [(keyserverURL: string)]: {
          urlPrefix: keyserverURL,
        },
      },
    };
  }, [keyserverURL]);

  const getVersionCall = useGetVersion(serverCallParamOverride);

  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(async () => {
    if (!keyserverURL) {
      return false;
    }

    const getVersionPromise = getVersionCall();
    void dispatchActionPromise(getVersionActionTypes, getVersionPromise);

    // We don't care about the result; just need to make sure this doesn't throw
    try {
      await getVersionPromise;
      return true;
    } catch (e) {
      return true;
    }
  }, [dispatchActionPromise, getVersionCall, keyserverURL]);
}

export { useIsKeyserverURLValid };
