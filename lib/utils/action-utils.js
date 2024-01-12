// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { CallSingleKeyserverEndpoint } from './call-single-keyserver-endpoint.js';
import { useSelector, useDispatch } from './redux-utils.js';
import { ashoatKeyserverID } from './validation-utils.js';
import {
  type ServerCallSelectorParams,
  useCallKeyserverEndpointContext,
} from '../keyserver-conn/call-keyserver-endpoint-provider.react.js';
import { serverCallStateSelector } from '../selectors/server-calls.js';

type ActionFunc<F> = (
  callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
) => F;

function useLegacyAshoatKeyserverCall<F>(
  serverCall: ActionFunc<F>,
  paramOverride?: ?Partial<ServerCallSelectorParams>,
): F {
  const dispatch = useDispatch();
  const serverCallState = useSelector(
    serverCallStateSelector(ashoatKeyserverID),
  );
  const { createCallSingleKeyserverEndpointSelector } =
    useCallKeyserverEndpointContext();
  const selector = React.useMemo(
    () => createCallSingleKeyserverEndpointSelector(ashoatKeyserverID),
    [createCallSingleKeyserverEndpointSelector],
  );

  return React.useMemo(() => {
    const { urlPrefix, isSocketConnected } = serverCallState;
    invariant(
      !!urlPrefix &&
        isSocketConnected !== undefined &&
        isSocketConnected !== null,
      'keyserver missing from keyserverStore',
    );

    const callSingleKeyserverEndpoint = selector({
      ...serverCallState,
      urlPrefix,
      isSocketConnected,
      dispatch,
      ...paramOverride,
    });
    return serverCall(callSingleKeyserverEndpoint);
  }, [serverCall, serverCallState, dispatch, paramOverride, selector]);
}

export { useLegacyAshoatKeyserverCall };
