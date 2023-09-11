// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { bindCookieAndUtilsIntoCallServerEndpoint } from './action-utils.js';
import type { CallServerEndpointOptions } from './call-server-endpoint.js';
import { useSelector } from './redux-utils.js';
import type { Endpoint } from '../types/endpoints.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';
import type { Dispatch } from '../types/redux-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

export type CallKeyserverEndpoint<Args: $ReadOnlyArray<mixed>> = (
  endpoint: Endpoint,
  input: any,
  args: Args,
  options?: ?CallServerEndpointOptions,
) => Promise<any>;

export type ActionFunc<Args: $ReadOnlyArray<mixed>, Return> = (
  callServerEndpoint: CallKeyserverEndpoint<Args>,
) => (...Args) => Promise<Return>;

export type KeyserverCallConfig<Args: $ReadOnlyArray<mixed>> =
  | { +keyserverSelection: 'fanout' }
  | {
      +keyserverSelection: 'specific',
      +keyserverIDExtractor: (...Args) => string,
    };

export type KeyserverCall<Args: $ReadOnlyArray<mixed>, Return> = {
  +actionFunc: ActionFunc<Args, Return>,
  +config: KeyserverCallConfig<Args>,
};

export type BindServerCall = <F>(serverCall: ActionFunc<F>) => F;

export type ExtractAndBindCookieAndUtilsParams<
  Args: $ReadOnlyArray<mixed>,
  Return,
> = {
  +dispatch: Dispatch,
  +currentUserInfo: ?CurrentUserInfo,
  +keyserverInfos: { +[keyserverID: string]: KeyserverInfo },
  +keyserverCall: KeyserverCall<Args, Return>,
};

function getCallKeyserverEndpoint<Args: $ReadOnlyArray<mixed>, Return>(
  params: ExtractAndBindCookieAndUtilsParams<Args, Return>,
): CallKeyserverEndpoint<Args> {
  const { dispatch, keyserverInfos, currentUserInfo, keyserverCall } = params;

  const { config: serverCallConfig } = keyserverCall;

  return (
    endpoint: Endpoint,
    data: Object,
    args: Args,
    options?: ?CallServerEndpointOptions,
  ) => {
    // TODO
    if (serverCallConfig.keyserverSelection === 'fanout') {
      return Promise.all([]);
    }
    const keyserverID = serverCallConfig.keyserverIDExtractor(...args);
    const {
      cookie,
      urlPrefix,
      sessionID,
      connection,
      lastCommunicatedPlatformDetails,
    } = keyserverInfos[keyserverID];

    const boundCallServerEndpoint = bindCookieAndUtilsIntoCallServerEndpoint({
      dispatch,
      currentUserInfo,
      cookie,
      urlPrefix,
      sessionID,
      connectionStatus: connection.status,
      lastCommunicatedPlatformDetails,
    });
    return boundCallServerEndpoint(endpoint, data, options);
  };
}

function useKeyserverCall<Args: $ReadOnlyArray<mixed>, Return>(
  keyserverCall: KeyserverCall<Args, Return>,
  paramOverride?: ?$Shape<ExtractAndBindCookieAndUtilsParams<Args, Return>>,
): (...Args) => Promise<Return> {
  const dispatch = useDispatch();
  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  return React.useMemo(() => {
    const callKeyserverEndpoint = getCallKeyserverEndpoint({
      dispatch,
      currentUserInfo,
      keyserverInfos,
      keyserverCall,
      ...paramOverride,
    });
    return keyserverCall.actionFunc(callKeyserverEndpoint);
  }, [dispatch, currentUserInfo, keyserverInfos, keyserverCall, paramOverride]);
}

export { useKeyserverCall };
