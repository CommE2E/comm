// @flow

import * as React from 'react';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';
import { createStore, applyMiddleware, type Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction.js';
import { persistReducer, persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/es/integration/react.js';
import thunk from 'redux-thunk';

import { reduxLoggerMiddleware } from 'lib/utils/action-logger.js';
import { isDev } from 'lib/utils/dev-utils.js';

import App from './app.react.js';
import { databaseModule } from './database/database-module-provider.js';
import { SQLiteDataHandler } from './database/sqlite-data-handler.js';
import { isSQLiteSupported } from './database/utils/db-utils.js';
import ErrorBoundary from './error-boundary.react.js';
import Loading from './loading.react.js';
import commReduxStorageEngine from './redux/comm-redux-storage-engine.js';
import { creatAsyncMigrate } from './redux/create-async-migrate.js';
import { reducer } from './redux/redux-setup.js';
import type { AppState, Action } from './redux/redux-setup.js';
import history from './router-history.js';
import Socket from './socket.react.js';
import { workerRequestMessageTypes } from './types/worker-types.js';

const currentLoggedInUserID = preloadedState.currentUserInfo?.anonymous
  ? undefined
  : preloadedState.currentUserInfo?.id;
const isDatabaseSupported = isSQLiteSupported(currentLoggedInUserID);

const migrations = {
  [1]: async state => {
    const {
      primaryIdentityPublicKey,
      ...stateWithoutPrimaryIdentityPublicKey
    } = state;
    return {
      ...stateWithoutPrimaryIdentityPublicKey,
      cryptoStore: {
        primaryAccount: null,
        primaryIdentityKeys: null,
        notificationAccount: null,
        notificationIdentityKeys: null,
      },
    };
  },
  [2]: async state => {
    if (!isDatabaseSupported) {
      return state;
    }

    const { drafts } = state.draftStore;
    const draftStoreOperations = [];
    for (const key in drafts) {
      const text = drafts[key];
      draftStoreOperations.push({
        type: 'update',
        payload: { key, text },
      });
    }

    await databaseModule.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: { draftStoreOperations },
    });

    return state;
  },
};
const persistWhitelist = [
  'enabledApps',
  'deviceID',
  'cryptoStore',
  'notifPermissionAlertInfo',
  'commServicesAccessToken',
];

const persistConfig = {
  key: 'root',
  storage: commReduxStorageEngine,
  whitelist: isDatabaseSupported
    ? persistWhitelist
    : [...persistWhitelist, 'draftStore'],
  migrate: (creatAsyncMigrate(migrations, { debug: isDev }): any),
  version: 2,
};

declare var preloadedState: AppState;
const persistedReducer = persistReducer(persistConfig, reducer);
const store: Store<AppState, Action> = createStore(
  persistedReducer,
  preloadedState,
  composeWithDevTools({})(applyMiddleware(thunk, reduxLoggerMiddleware)),
);
const persistor = persistStore(store);

const RootProvider = (): React.Node => (
  <Provider store={store}>
    <PersistGate persistor={persistor} loading={<Loading />}>
      <ErrorBoundary>
        <Router history={history.getHistoryObject()}>
          <Route path="*" component={App} />
        </Router>
        <Socket />
        <SQLiteDataHandler />
      </ErrorBoundary>
    </PersistGate>
  </Provider>
);

export default RootProvider;
