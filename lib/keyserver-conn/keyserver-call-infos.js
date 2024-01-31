// @flow

import { createSelector } from 'reselect';

import { useDerivedObject } from '../hooks/objects.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';

export type KeyserverInfoPartial = $ReadOnly<{
  ...Partial<KeyserverInfo>,
  +urlPrefix: $PropertyType<KeyserverInfo, 'urlPrefix'>,
}>;

export type KeyserverCallInfo = {
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +isSocketConnected: boolean,
  +sessionRecoveryInProgress: boolean,
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
        !!keyserverInfo.connection?.sessionRecoveryInProgress,
      (keyserverInfo: KeyserverInfoPartial) =>
        keyserverInfo.lastCommunicatedPlatformDetails,
      (
        cookie: ?string,
        urlPrefix: string,
        sessionID: ?string,
        isSocketConnected: boolean,
        sessionRecoveryInProgress: boolean,
        lastCommunicatedPlatformDetails: ?PlatformDetails,
      ) => ({
        cookie,
        urlPrefix,
        sessionID,
        isSocketConnected,
        sessionRecoveryInProgress,
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

export { useKeyserverCallInfos };
