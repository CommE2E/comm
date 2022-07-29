// @flow

import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, type Store } from 'redux';
import type { Reducer } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import thunk from 'redux-thunk';

import { reduxLoggerMiddleware } from 'lib/utils/action-logger';

import HotRoot from './hot';
import { reducer } from './redux/redux-setup';
import type { AppState, Action } from './redux/redux-setup';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['enabledApps'],
  version: 0,
};

declare var preloadedState: AppState;
// $FlowFixMe
const persistedReducer: Reducer<AppState, Action> = persistReducer(
  persistConfig,
  reducer,
);
const store: Store<AppState, Action> = createStore(
  persistedReducer,
  preloadedState,
  composeWithDevTools({})(applyMiddleware(thunk, reduxLoggerMiddleware)),
);

const RootProvider = (): React.Node => (
  <Provider store={store}>
    <HotRoot />
  </Provider>
);

export default RootProvider;
