// @flow

import invariant from 'invariant';

import type { LogInActionSourceTypes } from '../types/account-types';
import type { PlatformDetails } from '../types/device-types';
import type { DispatchRecoveryAttempt } from './action-utils';
import type { FetchJSON } from './fetch-json';

export type Config = {
  +resolveInvalidatedCookie: ?(
    fetchJSON: FetchJSON,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    source?: LogInActionSourceTypes,
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
