// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import { bindCookieAndUtilsIntoCallServerEndpoint } from './action-utils.js';
import type { BindServerCallsParams } from './action-utils.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from './call-server-endpoint.js';
import { useSelector } from './redux-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';
import type { Dispatch } from '../types/redux-types.js';
import type { ConnectionStatus } from '../types/socket-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

export type CallKeyserverEndpoint<Args: mixed> = (
  endpoint: Endpoint,
  input: { +[string]: mixed },
  args: Args,
  options?: ?CallServerEndpointOptions,
) => Promise<any>;

export type ActionFunc<Args: mixed, Return> = (
  callServerEndpoint: CallKeyserverEndpoint<Args>,
) => Args => Promise<Return>;

export type KeyserverCallConfig<Args: mixed> =
  | { +keyserverSelection: 'fanout' }
  | {
      +keyserverSelection: 'specific',
      +keyserverIDExtractor: Args => string,
    };

export type KeyserverCall<Args: mixed, Return> = {
  +actionFunc: ActionFunc<Args, Return>,
  +config: KeyserverCallConfig<Args>,
};

// _memoize memoizes the function by caching the result.
// The first argument of the memoized function is used as the map cache key.
const baseCreateBoundServerCallsSelector = (
  // eslint-disable-next-line no-unused-vars
  keyserverID: string,
): (BindServerCallsParams => CallServerEndpoint) =>
  createSelector(
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
    ) =>
      bindCookieAndUtilsIntoCallServerEndpoint({
        dispatch,
        cookie,
        urlPrefix,
        sessionID,
        currentUserInfo,
        connectionStatus,
        lastCommunicatedPlatformDetails,
      }),
  );

type CreateBoundServerCallsSelectorType =
  string => BindServerCallsParams => CallServerEndpoint;
const createBoundServerCallsSelector: CreateBoundServerCallsSelectorType =
  (_memoize(baseCreateBoundServerCallsSelector): any);

export type BindKeyserverCallParams = {
  +dispatch: Dispatch,
  +currentUserInfo: ?CurrentUserInfo,
  +keyserverInfos: { +[keyserverID: string]: KeyserverInfo },
};

export type GetCallKeyserverEndpointParams<Args: mixed> = {
  ...BindKeyserverCallParams,
  +keyserverCallConfig: KeyserverCallConfig<Args>,
};

const bindCallKeyserverEndpointSelector = createSelector(
  (state: BindKeyserverCallParams) => state.dispatch,
  (state: BindKeyserverCallParams) => state.currentUserInfo,
  (state: BindKeyserverCallParams) => state.keyserverInfos,
  (
    dispatch: Dispatch,
    currentUserInfo: ?CurrentUserInfo,
    keyserverInfos: { +[keyserverID: string]: KeyserverInfo },
  ) => {
    return _memoize(
      <Args: mixed, Return>(
        keyserverCall: KeyserverCall<Args, Return>,
      ): (Args => Promise<Return>) => {
        const callKeyserverEndpoint = (
          endpoint: Endpoint,
          data: Object,
          args: Args,
          options?: ?CallServerEndpointOptions,
        ) => {
          const bindCallKeyserverEndpoint = (keyserverID: string) => {
            const {
              cookie,
              urlPrefix,
              sessionID,
              connection,
              lastCommunicatedPlatformDetails,
            } = keyserverInfos[keyserverID];

            const boundCallServerEndpoint = createBoundServerCallsSelector(
              keyserverID,
            )({
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
          if (keyserverCall.config.keyserverSelection === 'fanout') {
            const promises = [];
            for (const keyserverID in keyserverInfos) {
              promises.push(bindCallKeyserverEndpoint(keyserverID));
            }
            return Promise.all(promises);
          }

          const keyserverID = keyserverCall.config.keyserverIDExtractor(args);
          return bindCallKeyserverEndpoint(keyserverID);
        };

        return keyserverCall.actionFunc(callKeyserverEndpoint);
      },
    );
  },
);

function useKeyserverCall<Args: mixed, Return>(
  keyserverCall: KeyserverCall<Args, Return>,
  paramOverride?: ?$Shape<BindKeyserverCallParams>,
): Args => Promise<Return> {
  const dispatch = useDispatch();
  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const bindCallKeyserverEndpointToAction = bindCallKeyserverEndpointSelector({
    dispatch,
    keyserverInfos,
    currentUserInfo,
    ...paramOverride,
  });
  return React.useMemo(
    () => bindCallKeyserverEndpointToAction(keyserverCall),
    [bindCallKeyserverEndpointToAction, keyserverCall],
  );
}

export { useKeyserverCall };
