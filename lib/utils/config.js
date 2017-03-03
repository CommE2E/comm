// @flow

import invariant from 'invariant';

export type Config = {
  urlPrefix: string,
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
