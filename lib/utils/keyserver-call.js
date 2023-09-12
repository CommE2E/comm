// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import { bindCookieAndUtilsIntoCallServerEndpoint } from './action-utils.js';
import type { BindServerCallsParams } from './action-utils.js';
import type { CallServerEndpointOptions } from './call-server-endpoint';
import { useSelector } from './redux-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';
import type { Dispatch } from '../types/redux-types.js';
import type { ConnectionStatus } from '../types/socket-types.js';
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

const boundCallServerEndpointSelector = createSelector(
  (state: BindServerCallsParams) => state.dispatch,
  (state: BindServerCallsParams) => state.cookie,
  (state: BindServerCallsParams) => state.urlPrefix,
  (state: BindServerCallsParams) => state.sessionID,
  (state: BindServerCallsParams) => state.currentUserInfo,
  (state: BindServerCallsParams) => state.connectionStatus,
  (state: BindServerCallsParams) => state.lastCommunicatedPlatformDetails,
  (
    dispatch: Dispatch,
    cookie: ?string,
    urlPrefix: string,
    sessionID: ?string,
    currentUserInfo: ?CurrentUserInfo,
    connectionStatus: ConnectionStatus,
    lastCommunicatedPlatformDetails: ?PlatformDetails,
  ) => {
    return bindCookieAndUtilsIntoCallServerEndpoint({
      dispatch,
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      connectionStatus,
      lastCommunicatedPlatformDetails,
    });
  },
);

export type BindKeyserverCallParams = {
  +dispatch: Dispatch,
  +currentUserInfo: ?CurrentUserInfo,
  +keyserverInfos: { +[keyserverID: string]: KeyserverInfo },
};

export type GetCallKeyserverEndpointParams<Args: $ReadOnlyArray<mixed>> = {
  ...BindKeyserverCallParams,
  +keyserverCallConfig: KeyserverCallConfig<Args>,
};

function getCallKeyserverEndpoint<Args: $ReadOnlyArray<mixed>>(
  params: GetCallKeyserverEndpointParams<Args>,
): CallKeyserverEndpoint<Args> {
  const { dispatch, keyserverInfos, currentUserInfo, keyserverCallConfig } =
    params;

  return (
    endpoint: Endpoint,
    data: Object,
    args: Args,
    options?: ?CallServerEndpointOptions,
  ) => {
    // TODO
    if (keyserverCallConfig.keyserverSelection === 'fanout') {
      return Promise.all([]);
    }
    const keyserverID = keyserverCallConfig.keyserverIDExtractor(...args);
    const {
      cookie,
      urlPrefix,
      sessionID,
      connection,
      lastCommunicatedPlatformDetails,
    } = keyserverInfos[keyserverID];

    const boundCallServerEndpoint = boundCallServerEndpointSelector({
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

const baseCreateBoundKeyserverCallActionSelector = <
  Args: $ReadOnlyArray<mixed>,
  Return,
>(
  keyserverCall: KeyserverCall<Args, Return>,
): (BindKeyserverCallParams => (...Args) => Promise<Return>) =>
  createSelector(
    (state: BindKeyserverCallParams) => state.dispatch,
    (state: BindKeyserverCallParams) => state.currentUserInfo,
    (state: BindKeyserverCallParams) => state.keyserverInfos,
    (
      dispatch: Dispatch,
      currentUserInfo: ?CurrentUserInfo,
      keyserverInfos: { +[keyserverID: string]: KeyserverInfo },
    ) => {
      const callKeyserverEndpoint = getCallKeyserverEndpoint({
        dispatch,
        currentUserInfo,
        keyserverInfos,
        keyserverCallConfig: keyserverCall.config,
      });
      return keyserverCall.actionFunc(callKeyserverEndpoint);
    },
  );

type CreateBoundKeyserverCallActionSelectorType = <
  Args: $ReadOnlyArray<mixed>,
  Return,
>(
  keyserverCall: KeyserverCall<Args, Return>,
) => BindKeyserverCallParams => (...Args) => Promise<Return>;
const createBoundKeyserverCallActionSelector: CreateBoundKeyserverCallActionSelectorType =
  _memoize(baseCreateBoundKeyserverCallActionSelector);

function useKeyserverCall<Args: $ReadOnlyArray<mixed>, Return>(
  keyserverCall: KeyserverCall<Args, Return>,
  paramOverride?: ?$Shape<BindKeyserverCallParams>,
): (...Args) => Promise<Return> {
  const dispatch = useDispatch();
  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  return React.useMemo(
    () =>
      createBoundKeyserverCallActionSelector(keyserverCall)({
        dispatch,
        currentUserInfo,
        keyserverInfos,
        ...paramOverride,
      }),

    [dispatch, currentUserInfo, keyserverInfos, keyserverCall, paramOverride],
  );
}

export { useKeyserverCall };
