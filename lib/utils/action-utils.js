// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useSelector, useDispatch } from './redux-utils.js';
import { ashoatKeyserverID } from './validation-utils.js';
import {
  type ActionFunc,
  type BindServerCallsParams,
  useCallKeyserverEndpointContext,
} from '../keyserver-conn/call-keyserver-endpoint-provider.react.js';
import { serverCallStateSelector } from '../selectors/server-calls.js';

function useServerCall<F>(
  serverCall: ActionFunc<F>,
  paramOverride?: ?Partial<BindServerCallsParams>,
): F {
  const dispatch = useDispatch();
  const serverCallState = useSelector(
    serverCallStateSelector(ashoatKeyserverID),
  );
  const { createBoundServerCallsSelector } = useCallKeyserverEndpointContext();
  const selector = React.useMemo(
    () => createBoundServerCallsSelector(serverCall),
    [createBoundServerCallsSelector, serverCall],
  );

  return React.useMemo(() => {
    const { urlPrefix, isSocketConnected } = serverCallState;
    invariant(
      !!urlPrefix &&
        isSocketConnected !== undefined &&
        isSocketConnected !== null,
      'keyserver missing from keyserverStore',
    );

    return selector({
      ...serverCallState,
      urlPrefix,
      isSocketConnected,
      dispatch,
      ...paramOverride,
      keyserverID: ashoatKeyserverID,
    });
  }, [serverCallState, dispatch, paramOverride, selector]);
}

export { useServerCall };
