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
  getNewCookie: ?((response: Object) => Promise<?string>),
  setCookieOnRequest: bool,
  calendarRangeInactivityLimit: ?number,
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
