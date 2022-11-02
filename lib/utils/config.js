// @flow

import invariant from 'invariant';

import type { LogInActionSource } from '../types/account-types';
import type { PlatformDetails } from '../types/device-types';
import type { DispatchRecoveryAttempt } from './action-utils';
import type { CallServerEndpoint } from './call-server-endpoint';

export type Config = {
  +resolveInvalidatedCookie: ?(
    callServerEndpoint: CallServerEndpoint,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    logInActionSource: LogInActionSource,
  ) => Promise<void>,
  +setCookieOnRequest: boolean,
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
