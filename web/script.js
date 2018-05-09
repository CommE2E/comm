// @flow

import 'babel-polyfill';
import 'isomorphic-fetch';

import type { Store } from 'redux';
import type { AppState, Action } from './redux-setup';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { Router, Route } from 'react-router';
import { AppContainer } from 'react-hot-loader';
import thunk from 'redux-thunk';
import {
  composeWithDevTools,
} from 'redux-devtools-extension/logOnlyInProduction';
import invariant from 'invariant';

import { reducer } from './redux-setup';

import App from './app.react';
import history from './router-history';

declare var preloadedState: AppState;
const store: Store<AppState, Action> = createStore(
  reducer,
  preloadedState,
  composeWithDevTools({})(applyMiddleware(thunk)),
);

const root = document.getElementById('react-root');
invariant(root, "cannot find id='react-root' element!");

// $FlowFixMe https://github.com/facebook/flow/issues/5035
const render = (Component) => ReactDOM.hydrate(
  <AppContainer>
    <Provider store={store}>
      <Router history={history.getHistoryObject()}>
        <Route path="*" component={Component} />
      </Router>
    </Provider>
  </AppContainer>,
  root,
);
render(App);

declare var module: { hot?: {
  accept: (string, Function) => void,
} };
if (module.hot) {
  module.hot.accept('./app.react', () => render(App));
}
