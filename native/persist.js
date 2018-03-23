// @flow

import storage from 'redux-persist/lib/storage';
import { createMigrate } from 'redux-persist';
import invariant from 'invariant';

const blacklist = __DEV__
  ? [
      'sessionID',
      'lastUserInteraction',
      'loadingStatuses',
    ]
  : [
      'sessionID',
      'lastUserInteraction',
      'loadingStatuses',
      'navInfo',
    ];

const migrations = {
  /** example
  [0]: (state) => ({
    ...state,
    test: "hello",
  }), **/
};

const persistConfig = {
  key: 'root',
  storage,
  blacklist,
  debug: __DEV__,
  version: 0,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
};

const codeVersion = 3;

// This local exists to avoid a circular dependency where redux-setup needs to
// import all the navigation and screen stuff, but some of those screens want to
// access the persistor to purge its state.
let storedPersistor = null;
function setPersistor(persistor: *) {
  storedPersistor = persistor;
}
function getPersistor() {
  invariant(storedPersistor, "should be set");
  return storedPersistor;
}

export {
  persistConfig,
  codeVersion,
  setPersistor,
  getPersistor,
};
