// @flow

import invariant from 'invariant';

import type { CallServerEndpoint } from './call-server-endpoint.js';
import type { CallKeyserverEndpoint } from './keyserver-call.js';
import type { DispatchRecoveryAttempt } from '../keyserver-conn/keyserver-conn-types.js';
import type { LogInActionSource } from '../types/account-types.js';
import type { PlatformDetails } from '../types/device-types.js';

export type Config = {
  +resolveKeyserverSessionInvalidationUsingNativeCredentials: ?(
    callServerEndpoint: CallServerEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    logInActionSource: LogInActionSource,
    keyserverID: string,
    getInitialNotificationsEncryptedMessage?: (
      deviceID: string,
    ) => Promise<string>,
  ) => Promise<void>,
  +setSessionIDOnRequest: boolean,
  +calendarRangeInactivityLimit: ?number,
  +platformDetails: PlatformDetails,
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
