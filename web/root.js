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
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import { reduxLoggerMiddleware } from 'lib/utils/redux-logger';

import App from './app.react';
import Socket from './socket.react';
import history from './router-history';
import { reducer } from './redux-setup';

declare var preloadedState: AppState;
const store: Store<AppState, Action> = createStore(
  reducer,
  preloadedState,
  composeWithDevTools({})(
    applyMiddleware(thunk, reduxLoggerMiddleware),
  ),
);

const RootRouter = () => (
  <Router history={history.getHistoryObject()}>
    <Route path="*" component={App} />
  </Router>
);
const ReactDnDConnectedRootRouter = DragDropContext(HTML5Backend)(RootRouter);

const RootComponent = () => (
  <React.Fragment>
    <ReactDnDConnectedRootRouter />
    <Socket />
  </React.Fragment>
);
const RootHMR = hot(module)(RootComponent);

const RootProvider = () => (
  <Provider store={store}>
    <RootHMR />
  </Provider>
);

export default RootProvider;
