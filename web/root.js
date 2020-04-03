// @flow

import type { AppState, Action } from './redux-setup';

import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, type Store } from 'redux';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction';

import { reduxLoggerMiddleware } from 'lib/utils/action-logger';

import { reducer } from './redux-setup';
import HotRoot from './hot';

declare var preloadedState: AppState;
const store: Store<AppState, Action> = createStore(
  reducer,
  preloadedState,
  composeWithDevTools({})(applyMiddleware(thunk, reduxLoggerMiddleware)),
);

const RootProvider = () => (
  <Provider store={store}>
    <HotRoot />
  </Provider>
);

export default RootProvider;
