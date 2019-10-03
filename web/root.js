// @flow

import type { AppState, Action } from './redux-setup';

import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, type Store } from 'redux';
import thunk from 'redux-thunk';
import {
  composeWithDevTools,
} from 'redux-devtools-extension/logOnlyInProduction';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import { reduxLoggerMiddleware } from 'lib/utils/redux-logger';

import { reducer } from './redux-setup';
import HotRoot from './hot';

declare var preloadedState: AppState;
const store: Store<AppState, Action> = createStore(
  reducer,
  preloadedState,
  composeWithDevTools({})(
    applyMiddleware(thunk, reduxLoggerMiddleware),
  ),
);

const ReactDnDConnectedRoot = DragDropContext(HTML5Backend)(HotRoot);

const RootProvider = () => (
  <Provider store={store}>
    <ReactDnDConnectedRoot />
  </Provider>
);

export default RootProvider;
