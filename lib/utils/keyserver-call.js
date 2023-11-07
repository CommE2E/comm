// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { createSelector } from 'reselect';

import { bindCookieAndUtilsIntoCallServerEndpoint } from './action-utils.js';
import type { BindServerCallsParams } from './action-utils.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from './call-server-endpoint.js';
import { promiseAll } from './promises.js';
import { useSelector, useDispatch } from './redux-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';
import type { Dispatch } from '../types/redux-types.js';
import type { ConnectionStatus } from '../types/socket-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

export type CallKeyserverEndpoint = (
  endpoint: Endpoint,
  requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
  options?: ?CallServerEndpointOptions,
) => Promise<{ +[keyserverID: string]: any }>;

export type ActionFunc<Args: mixed, Return> = (
  callServerEndpoint: CallKeyserverEndpoint,
  // The second argument is only used in actions that call all keyservers,
  // and the request to all keyservers are exactly the same.
  // An example of such action is fetchEntries.
  allKeyserverIDs: $ReadOnlyArray<string>,
) => Args => Promise<Return>;

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
        keyserverID,
      }),
  );

type CreateBoundServerCallsSelectorType = (
  keyserverID: string,
) => BindServerCallsParams => CallServerEndpoint;
const createBoundServerCallsSelector: CreateBoundServerCallsSelectorType =
  (_memoize(baseCreateBoundServerCallsSelector): any);

export type KeyserverInfoPartial = $Shape<KeyserverInfo>;

export type BindKeyserverCallParams = {
  +dispatch: Dispatch,
  +currentUserInfo: ?CurrentUserInfo,
  +keyserverInfos: { +[keyserverID: string]: KeyserverInfoPartial },
};

const bindCallKeyserverEndpointSelector: BindKeyserverCallParams => <
  Args: mixed,
  Return,
>(
  keyserverCall: ActionFunc<Args, Return>,
) => Args => Promise<Return> = createSelector(
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
        keyserverCall: ActionFunc<Args, Return>,
      ): (Args => Promise<Return>) => {
        const callKeyserverEndpoint = (
          endpoint: Endpoint,
          requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
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
              connectionStatus: connection?.status,
              lastCommunicatedPlatformDetails,
              keyserverID,
            });

            return boundCallServerEndpoint(
              endpoint,
              requests[keyserverID],
              options,
            );
          };

          const promises: { [string]: Promise<CallServerEndpoint> } = {};
          for (const keyserverID in requests) {
            promises[keyserverID] = bindCallKeyserverEndpoint(keyserverID);
          }
          return promiseAll(promises);
        };
        const keyserverIDs = Object.keys(keyserverInfos);
        return keyserverCall(callKeyserverEndpoint, keyserverIDs);
      },
    );
  },
);

export type KeyserverCallParamOverride = $Shape<BindKeyserverCallParams>;

function useKeyserverCall<Args: mixed, Return>(
  keyserverCall: ActionFunc<Args, Return>,
  paramOverride?: ?KeyserverCallParamOverride,
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
