// @flow

import invariant from 'invariant';

import type { CallSingleKeyserverEndpoint } from './call-single-keyserver-endpoint.js';
import type {
  DispatchRecoveryAttempt,
  CallKeyserverEndpoint,
} from '../keyserver-conn/keyserver-conn-types.js';
import type { InitialNotifMessageOptions } from '../shared/crypto-utils.js';
import type { LogInActionSource } from '../types/account-types.js';
import type { OlmAPI } from '../types/crypto-types.js';
import type { PlatformDetails } from '../types/device-types.js';

export type Config = {
  +resolveKeyserverSessionInvalidationUsingNativeCredentials: ?(
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    logInActionSource: LogInActionSource,
    keyserverID: string,
    getInitialNotificationsEncryptedMessage?: (
      keyserverID: string,
      options?: ?InitialNotifMessageOptions,
    ) => Promise<string>,
  ) => Promise<void>,
  +setSessionIDOnRequest: boolean,
  +calendarRangeInactivityLimit: ?number,
  +platformDetails: PlatformDetails,
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

export { registerConfig, getConfig };
