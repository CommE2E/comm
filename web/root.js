// @flow

import localforage from 'localforage';
import * as React from 'react';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';
import { createStore, applyMiddleware, type Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction.js';
import { persistReducer, persistStore } from 'redux-persist';
import thunk from 'redux-thunk';

import { reduxLoggerMiddleware } from 'lib/utils/action-logger.js';

import App from './app.react.js';
import { SQLiteDataHandler } from './database/sqlite-data-handler.js';
import { localforageConfig } from './database/utils/constants.js';
import ErrorBoundary from './error-boundary.react.js';
import InitialReduxStateGate from './redux/initial-state-gate.js';
import { persistConfig } from './redux/persist.js';
import { type AppState, type Action, reducer } from './redux/redux-setup.js';
import history from './router-history.js';
import Socket from './socket.react.js';

localforage.config(localforageConfig);

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
    <ErrorBoundary>
      <InitialReduxStateGate persistor={persistor}>
        <Router history={history.getHistoryObject()}>
          <Route path="*" component={App} />
        </Router>
        <Socket />
        <SQLiteDataHandler />
      </InitialReduxStateGate>
    </ErrorBoundary>
  </Provider>
);

export default RootProvider;
