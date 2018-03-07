// @flow

import storage from 'redux-persist/lib/storage';
import { createMigrate } from 'redux-persist';

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

const codeVersion = 0;

export {
  persistConfig,
  codeVersion,
};
