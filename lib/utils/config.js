// @flow

import invariant from 'invariant';
import type { FetchJSON } from './fetch-json';
import type { DispatchRecoveryAttempt } from './action-utils';

export type Config = {
  urlPrefix: string,
  resolveInvalidatedCookie: ?((
    fetchJSON: FetchJSON,
    dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  ) => Promise<void>),
  getNativeCookie: ?(() => Promise<?string>),
  calendarRangeInactivityLimit: ?number,
};

let registeredConfig: ?Config = null;

const registerConfig = (config: Config) => {
  registeredConfig = config;
};

const getConfig = (): Config => {
  invariant(registeredConfig, "config should be set");
  return registeredConfig;
};

export {
  registerConfig,
  getConfig,
};
