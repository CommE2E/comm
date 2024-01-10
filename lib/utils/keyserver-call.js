// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { createSelector } from 'reselect';

import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from './call-server-endpoint.js';
import { promiseAll } from './promises.js';
import { useSelector, useDispatch } from './redux-utils.js';
import { useDerivedObject } from '../hooks/objects.js';
import {
  useCallKeyserverEndpointContext,
  type BindServerCallsParams,
} from '../keyserver-conn/call-keyserver-endpoint-provider.react.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';
import type { Dispatch } from '../types/redux-types.js';
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
  keyserverID: string,
  bindCookieAndUtilsIntoCallServerEndpoint: (
    params: BindServerCallsParams,
  ) => CallServerEndpoint,
): (BindServerCallsParams => CallServerEndpoint) =>
  createSelector(
    (state: BindServerCallsParams) => state.dispatch,
    (state: BindServerCallsParams) => state.cookie,
    (state: BindServerCallsParams) => state.urlPrefix,
    (state: BindServerCallsParams) => state.sessionID,
    (state: BindServerCallsParams) => state.currentUserInfo,
    (state: BindServerCallsParams) => state.isSocketConnected,
    (state: BindServerCallsParams) => state.lastCommunicatedPlatformDetails,
    (
      dispatch: Dispatch,
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      isSocketConnected: boolean,
      lastCommunicatedPlatformDetails: ?PlatformDetails,
    ) =>
      bindCookieAndUtilsIntoCallServerEndpoint({
        dispatch,
        cookie,
        urlPrefix,
        sessionID,
        currentUserInfo,
        isSocketConnected,
        lastCommunicatedPlatformDetails,
        keyserverID,
      }),
  );

type CreateBoundServerCallsSelectorType = (
  keyserverID: string,
  bindCookieAndUtilsIntoCallServerEndpoint: (
    params: BindServerCallsParams,
  ) => CallServerEndpoint,
) => BindServerCallsParams => CallServerEndpoint;
const createBoundServerCallsSelector: CreateBoundServerCallsSelectorType =
  _memoize(baseCreateBoundServerCallsSelector);

type KeyserverInfoPartial = $ReadOnly<{
  ...Partial<KeyserverInfo>,
  +urlPrefix: $PropertyType<KeyserverInfo, 'urlPrefix'>,
}>;

type KeyserverCallInfo = {
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +isSocketConnected: boolean,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};

const createKeyserverCallSelector: () => KeyserverInfoPartial => KeyserverCallInfo =
  () =>
    createSelector(
      (keyserverInfo: KeyserverInfoPartial) => keyserverInfo.cookie,
      (keyserverInfo: KeyserverInfoPartial) => keyserverInfo.urlPrefix,
      (keyserverInfo: KeyserverInfoPartial) => keyserverInfo.sessionID,
      (keyserverInfo: KeyserverInfoPartial) =>
        keyserverInfo.connection?.status === 'connected',
      (keyserverInfo: KeyserverInfoPartial) =>
        keyserverInfo.lastCommunicatedPlatformDetails,
      (
        cookie: ?string,
        urlPrefix: string,
        sessionID: ?string,
        isSocketConnected: boolean,
        lastCommunicatedPlatformDetails: ?PlatformDetails,
      ) => ({
        cookie,
        urlPrefix,
        sessionID,
        isSocketConnected,
        lastCommunicatedPlatformDetails,
      }),
    );

function useKeyserverCallInfos(keyserverInfos: {
  +[keyserverID: string]: KeyserverInfoPartial,
}): { +[keyserverID: string]: KeyserverCallInfo } {
  return useDerivedObject<KeyserverInfoPartial, KeyserverCallInfo>(
    keyserverInfos,
    createKeyserverCallSelector,
  );
}

type BindCallKeyserverSelector = <Args: mixed, Return>(
  keyserverCall: ActionFunc<Args, Return>,
) => Args => Promise<Return>;
function useBindCallKeyserverEndpointSelector(
  dispatch: Dispatch,
  currentUserInfo: ?CurrentUserInfo,
  keyserverCallInfos: { +[keyserverID: string]: KeyserverCallInfo },
): BindCallKeyserverSelector {
  const { bindCookieAndUtilsIntoCallServerEndpoint } =
    useCallKeyserverEndpointContext();
  return React.useMemo(
    () =>
      _memoize(
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
                isSocketConnected,
                lastCommunicatedPlatformDetails,
              } = keyserverCallInfos[keyserverID];

              const boundCallServerEndpoint = createBoundServerCallsSelector(
                keyserverID,
                bindCookieAndUtilsIntoCallServerEndpoint,
              )({
                dispatch,
                currentUserInfo,
                cookie,
                urlPrefix,
                sessionID,
                isSocketConnected,
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
          const keyserverIDs = Object.keys(keyserverCallInfos);
          return keyserverCall(callKeyserverEndpoint, keyserverIDs);
        },
      ),
    [
      dispatch,
      currentUserInfo,
      keyserverCallInfos,
      bindCookieAndUtilsIntoCallServerEndpoint,
    ],
  );
}

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

  const bindCallKeyserverEndpointToAction =
    useBindCallKeyserverEndpointSelector(
      dispatch,
      currentUserInfo,
      keyserverCallInfos,
    );

  return React.useMemo(
    () => bindCallKeyserverEndpointToAction(keyserverCall),
    [bindCallKeyserverEndpointToAction, keyserverCall],
  );
}

export { useKeyserverCall };
