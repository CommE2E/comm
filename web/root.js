// @flow

import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, type Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction';
import thunk from 'redux-thunk';

import { reduxLoggerMiddleware } from 'lib/utils/action-logger';

import HotRoot from './hot';
import { reducer } from './redux/redux-setup';
import type { AppState, Action } from './redux/redux-setup';

declare var preloadedState: AppState;
const store: Store<AppState, Action> = createStore(
  reducer,
  preloadedState,
  composeWithDevTools({})(applyMiddleware(thunk, reduxLoggerMiddleware)),
);

const RootProvider = (): React.Node => (
  <Provider store={store}>
    <HotRoot />
  </Provider>
);

export default RootProvider;
