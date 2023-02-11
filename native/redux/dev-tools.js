// @flow

import { getDevServerHostname } from '../utils/url-utils.js';

const remoteReduxDevServerConfig = {
  port: 8043,
  suppressConnectErrors: false, // we want to see error messages
};

// Since there's no way to run the Hermes runtime externally, when debugging we
// can no longer rely on the debugger to set these globals. We have to set them
// ourselves to work with remote-redux-devtools
if (__DEV__ && global.HermesInternal && !global.__REDUX_DEVTOOLS_EXTENSION__) {
  const { connect } = require('remotedev/src/index.js');
  global.__REDUX_DEVTOOLS_EXTENSION__ = {
    connect: ({ name }) =>
      connect({
        name,
        hostname: getDevServerHostname(),
        ...remoteReduxDevServerConfig,
      }),
  };
}

export { remoteReduxDevServerConfig };
