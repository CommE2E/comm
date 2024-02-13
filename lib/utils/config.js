// @flow

import invariant from 'invariant';

import type { CallSingleKeyserverEndpoint } from './call-single-keyserver-endpoint.js';
import type {
  DispatchRecoveryAttempt,
  CallKeyserverEndpoint,
} from '../keyserver-conn/keyserver-conn-types.js';
import type { InitialNotifMessageOptions } from '../shared/crypto-utils.js';
import type { RecoveryActionSource } from '../types/account-types.js';
import type { OlmAPI } from '../types/crypto-types.js';
import type { PlatformDetails } from '../types/device-types.js';

export type Config = {
  +resolveKeyserverSessionInvalidationUsingNativeCredentials: ?(
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    recoveryActionSource: RecoveryActionSource,
    keyserverID: string,
    getInitialNotificationsEncryptedMessage?: (
      keyserverID: string,
      options?: ?InitialNotifMessageOptions,
    ) => Promise<string>,
  ) => Promise<void>,
  +setSessionIDOnRequest: boolean,
  +calendarRangeInactivityLimit: ?number,
  +platformDetails: PlatformDetails,
  +authoritativeKeyserverID: string,
  +olmAPI: OlmAPI,
};

let registeredConfig: ?Config = null;

const registerConfig = (config: Config) => {
  registeredConfig = { ...registeredConfig, ...config };
};

const getConfig = (): Config => {
  invariant(registeredConfig, 'config should be set');
  return registeredConfig;
};

const hasConfig = (): boolean => {
  return !!registeredConfig;
};

export { registerConfig, getConfig, hasConfig };
