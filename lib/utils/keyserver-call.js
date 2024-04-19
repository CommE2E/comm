// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';

import { promiseAll } from './promises.js';
import { useSelector, useDispatch } from './redux-utils.js';
import { useCallKeyserverEndpointContext } from '../keyserver-conn/call-keyserver-endpoint-provider.react.js';
import type { CallSingleKeyserverEndpointOptions } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import {
  useKeyserverCallInfos,
  type KeyserverInfoPartial,
} from '../keyserver-conn/keyserver-call-infos.js';
import type { ActionFunc } from '../keyserver-conn/keyserver-conn-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

export type KeyserverCallParamOverride = Partial<{
  +dispatch: Dispatch,
  +currentUserInfo: ?CurrentUserInfo,
  +keyserverInfos: { +[keyserverID: string]: KeyserverInfoPartial },
}>;

function useKeyserverCall<Args: mixed, Return>(
  keyserverCall: ActionFunc<Args, Return>,
  paramOverride?: ?KeyserverCallParamOverride,
): Args => Promise<Return> {
  const baseDispatch = useDispatch();
  const baseCurrentUserInfo = useSelector(state => state.currentUserInfo);

  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );
  const baseCombinedInfo = {
    dispatch: baseDispatch,
    currentUserInfo: baseCurrentUserInfo,
    keyserverInfos,
    ...paramOverride,
  };

  const {
    dispatch,
    currentUserInfo,
    keyserverInfos: keyserverInfoPartials,
  } = baseCombinedInfo;
  const keyserverCallInfos = useKeyserverCallInfos(keyserverInfoPartials);

  const {
    createCallSingleKeyserverEndpointSelector,
    getBoundKeyserverActionFunc,
  } = useCallKeyserverEndpointContext();
  const getCallSingleKeyserverEndpointSelector: typeof createCallSingleKeyserverEndpointSelector =
    React.useMemo(
      () => _memoize(createCallSingleKeyserverEndpointSelector),
      [createCallSingleKeyserverEndpointSelector],
    );

  const cachedNonOverridenBoundKeyserverCall = React.useMemo(
    () => getBoundKeyserverActionFunc(keyserverCall),
    [getBoundKeyserverActionFunc, keyserverCall],
  );

  return React.useMemo(() => {
    if (!paramOverride) {
      return cachedNonOverridenBoundKeyserverCall;
    }

    const callKeyserverEndpoint = (
      endpoint: Endpoint,
      requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
      options?: ?CallSingleKeyserverEndpointOptions,
    ) => {
      const makeCallToSingleKeyserver = (keyserverID: string) => {
        const {
          cookie,
          urlPrefix,
          sessionID,
          isSocketConnected,
          activeSessionRecovery,
          lastCommunicatedPlatformDetails,
        } = keyserverCallInfos[keyserverID];

        const boundCallSingleKeyserverEndpoint =
          getCallSingleKeyserverEndpointSelector(keyserverID)({
            dispatch,
            currentUserInfo,
            cookie,
            urlPrefix,
            sessionID,
            isSocketConnected,
            activeSessionRecovery,
            lastCommunicatedPlatformDetails,
          });

        return boundCallSingleKeyserverEndpoint(
          endpoint,
          requests[keyserverID],
          options,
        );
      };

      const promises: { [string]: Promise<Object> } = {};
      for (const keyserverID in requests) {
        promises[keyserverID] = makeCallToSingleKeyserver(keyserverID);
      }
      return promiseAll(promises);
    };
    const keyserverIDs = Object.keys(keyserverCallInfos);
    return keyserverCall(callKeyserverEndpoint, keyserverIDs);
  }, [
    paramOverride,
    cachedNonOverridenBoundKeyserverCall,
    dispatch,
    currentUserInfo,
    keyserverCallInfos,
    getCallSingleKeyserverEndpointSelector,
    keyserverCall,
  ]);
}

export { useKeyserverCall };
