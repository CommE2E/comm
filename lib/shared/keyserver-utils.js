// @flow

import * as React from 'react';

import {
  useGetVersion,
  getVersionActionTypes,
} from '../actions/device-actions.js';
import { urlsToIDsSelector } from '../selectors/keyserver-selectors.js';
import type { VersionResponse } from '../types/device-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useIsKeyserverURLValid(
  keyserverURL?: string,
): () => Promise<VersionResponse> {
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
      throw new Error('isKeyserverURLValid called with empty URL');
    }

    const getVersionPromise = getVersionCall();
    void dispatchActionPromise(getVersionActionTypes, getVersionPromise);

    const { versionResponses } = await getVersionPromise;
    return versionResponses[Object.keys(versionResponses)[0]];
  }, [dispatchActionPromise, getVersionCall, keyserverURL]);
}

export { useIsKeyserverURLValid };
