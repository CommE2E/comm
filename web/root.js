// @flow

import * as React from 'react';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';
import { createStore, applyMiddleware, type Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction';
import { persistReducer, persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import storage from 'redux-persist/lib/storage';
import thunk from 'redux-thunk';

import { reduxLoggerMiddleware } from 'lib/utils/action-logger';

import App from './app.react';
import ErrorBoundary from './error-boundary.react';
import Loading from './loading.react';
import { reducer } from './redux/redux-setup';
import type { AppState, Action } from './redux/redux-setup';
import history from './router-history';
import Socket from './socket.react';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['enabledApps', 'deviceID', 'draftStore'],
  version: 0,
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
      </ErrorBoundary>
    </PersistGate>
  </Provider>
);

export default RootProvider;
