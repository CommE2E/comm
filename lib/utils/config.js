// @flow

import invariant from 'invariant';

import type { DispatchRecoveryAttempt } from './action-utils.js';
import type { CallServerEndpoint } from './call-server-endpoint.js';
import type { CallKeyserverEndpoint } from './keyserver-call.js';
import type { LogInActionSource } from '../types/account-types.js';
import type { PlatformDetails } from '../types/device-types.js';

export type Config = {
  +resolveInvalidatedCookie: ?(
    callServerEndpoint: CallServerEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    logInActionSource: LogInActionSource,
    keyserverID: string,
    getInitialNotificationsEncryptedMessage?: () => Promise<string>,
  ) => Promise<void>,
  +setSessionIDOnRequest: boolean,
  +calendarRangeInactivityLimit: ?number,
  +platformDetails: PlatformDetails,
};

let registeredConfig: ?Config = null;

const registerConfig = (config: $Shape<Config>) => {
  registeredConfig = { ...registeredConfig, ...config };
};

const getConfig = (): Config => {
  invariant(registeredConfig, 'config should be set');
  return registeredConfig;
};

export { registerConfig, getConfig };
