// @flow

import * as React from 'react';

import {
  useGetVersion,
  getVersionActionTypes,
} from '../actions/device-actions.js';
import { urlsToIDsSelector } from '../selectors/keyserver-selectors.js';
import { useDispatchActionPromise } from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useIsKeyserverURLValid(keyserverURL?: string): () => Promise<boolean> {
  const urlsToIDs: { +[keyserverID: string]: ?string } =
    useSelector(urlsToIDsSelector);

  const keyserverID: ?string = keyserverURL
    ? urlsToIDs[keyserverURL]
    : undefined;

  const keyserverInfo = useSelector(state =>
    keyserverID ? state.keyserverStore.keyserverInfos[keyserverID] : undefined,
  );

  const serverCallParamOverride = React.useMemo(() => {
    if (!keyserverURL) {
      return undefined;
    }

    if (keyserverInfo && keyserverID) {
      return {
        keyserverInfos: {
          [(keyserverID: string)]: keyserverInfo,
        },
      };
    }

    return {
      keyserverInfos: {
        [(keyserverURL: string)]: {
          urlPrefix: keyserverURL,
        },
      },
    };
  }, [keyserverID, keyserverInfo, keyserverURL]);

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
      return false;
    }
  }, [dispatchActionPromise, getVersionCall, keyserverURL]);
}

export { useIsKeyserverURLValid };
