// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  type ServerCallSelectorParams,
  useCallKeyserverEndpointContext,
} from './call-keyserver-endpoint-provider.react.js';
import type { SingleKeyserverActionFunc } from './keyserver-conn-types.js';
import { serverCallStateSelector } from '../selectors/server-calls.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

function useLegacyAshoatKeyserverCall<F>(
  serverCall: SingleKeyserverActionFunc<F>,
  paramOverride?: ?Partial<ServerCallSelectorParams>,
): F {
  const {
    createCallSingleKeyserverEndpointSelector,
    getBoundSingleKeyserverActionFunc,
  } = useCallKeyserverEndpointContext();

  const cachedNonOverridenBoundServerCall = React.useMemo(
    () =>
      getBoundSingleKeyserverActionFunc(authoritativeKeyserverID(), serverCall),
    [getBoundSingleKeyserverActionFunc, serverCall],
  );

  const customSelector = React.useMemo(
    () => createCallSingleKeyserverEndpointSelector(authoritativeKeyserverID()),
    [createCallSingleKeyserverEndpointSelector],
  );
  const dispatch = useDispatch();
  const serverCallState = useSelector(
    serverCallStateSelector(authoritativeKeyserverID()),
  );

  return React.useMemo(() => {
    if (!paramOverride) {
      return cachedNonOverridenBoundServerCall;
    }

    const { urlPrefix, isSocketConnected, activeSessionRecovery } =
      serverCallState;
    invariant(
      !!urlPrefix &&
        isSocketConnected !== undefined &&
        isSocketConnected !== null &&
        activeSessionRecovery !== undefined,
      'keyserver missing from keyserverStore',
    );

    const callSingleKeyserverEndpoint = customSelector({
      ...serverCallState,
      urlPrefix,
      isSocketConnected,
      activeSessionRecovery,
      dispatch,
      ...paramOverride,
    });
    return serverCall(callSingleKeyserverEndpoint);
  }, [
    cachedNonOverridenBoundServerCall,
    serverCall,
    serverCallState,
    dispatch,
    paramOverride,
    customSelector,
  ]);
}

export { useLegacyAshoatKeyserverCall };
