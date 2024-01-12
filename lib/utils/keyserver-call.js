// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';

import type { CallServerEndpointOptions } from './call-server-endpoint.js';
import { promiseAll } from './promises.js';
import { useSelector, useDispatch } from './redux-utils.js';
import { useCallKeyserverEndpointContext } from '../keyserver-conn/call-keyserver-endpoint-provider.react.js';
import {
  useKeyserverCallInfos,
  type KeyserverInfoPartial,
} from '../keyserver-conn/keyserver-call-infos.js';
import type { Endpoint } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

export type CallKeyserverEndpoint = (
  endpoint: Endpoint,
  requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
  options?: ?CallServerEndpointOptions,
) => Promise<{ +[keyserverID: string]: any }>;

type ActionFunc<Args: mixed, Return> = (
  callServerEndpoint: CallKeyserverEndpoint,
  // The second argument is only used in actions that call all keyservers,
  // and the request to all keyservers are exactly the same.
  // An example of such action is fetchEntries.
  allKeyserverIDs: $ReadOnlyArray<string>,
) => Args => Promise<Return>;

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

  const { createCallSingleKeyserverEndpointSelector } =
    useCallKeyserverEndpointContext();
  const getCallSingleKeyserverEndpointSelector: typeof createCallSingleKeyserverEndpointSelector =
    React.useMemo(
      () => _memoize(createCallSingleKeyserverEndpointSelector),
      [createCallSingleKeyserverEndpointSelector],
    );

  return React.useMemo(() => {
    const callKeyserverEndpoint = (
      endpoint: Endpoint,
      requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
      options?: ?CallServerEndpointOptions,
    ) => {
      const makeCallToSingleKeyserver = (keyserverID: string) => {
        const {
          cookie,
          urlPrefix,
          sessionID,
          isSocketConnected,
          lastCommunicatedPlatformDetails,
        } = keyserverCallInfos[keyserverID];

        const boundCallServerEndpoint = getCallSingleKeyserverEndpointSelector(
          keyserverID,
        )({
          dispatch,
          currentUserInfo,
          cookie,
          urlPrefix,
          sessionID,
          isSocketConnected,
          lastCommunicatedPlatformDetails,
        });

        return boundCallServerEndpoint(
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
    dispatch,
    currentUserInfo,
    keyserverCallInfos,
    getCallSingleKeyserverEndpointSelector,
    keyserverCall,
  ]);
}

export { useKeyserverCall };
