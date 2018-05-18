// @flow

import type { Store } from 'redux';
import type { AppState, Action } from './redux-setup';

import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { Router, Route } from 'react-router';
import { hot } from 'react-hot-loader';
import thunk from 'redux-thunk';
import {
  composeWithDevTools,
} from 'redux-devtools-extension/logOnlyInProduction';

import App from './app.react';
import history from './router-history';
import { reducer } from './redux-setup';

declare var preloadedState: AppState;
const store: Store<AppState, Action> = createStore(
  reducer,
  preloadedState,
  composeWithDevTools({})(applyMiddleware(thunk)),
);

const RootRouter = () => (
  <Router history={history.getHistoryObject()}>
    <Route path="*" component={App} />
  </Router>
);
const RootHMR = hot(module)(RootRouter);

const RootProvider = () => (
  <Provider store={store}>
    <RootHMR />
  </Provider>
);

export default RootProvider;
