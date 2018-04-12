// @flow

import type { FetchJSON } from './fetch-json';
import type { DispatchRecoveryAttempt } from './action-utils';
import type { Platform } from '../types/device-types';

import invariant from 'invariant';

export type Config = {
  resolveInvalidatedCookie: ?((
    fetchJSON: FetchJSON,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
    deviceToken: ?string,
  ) => Promise<void>),
  getNewCookie: ?((response: Object) => Promise<?string>),
  setCookieOnRequest: bool,
  calendarRangeInactivityLimit: ?number,
  platform: Platform,
};

let registeredConfig: ?Config = null;

const registerConfig = (config: $Shape<Config>) => {
  registeredConfig = { ...registeredConfig, ...config };
};

const getConfig = (): Config => {
  invariant(registeredConfig, "config should be set");
  return registeredConfig;
};

export {
  registerConfig,
  getConfig,
};
