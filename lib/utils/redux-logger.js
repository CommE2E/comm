// @flow

import type { AppState } from '../types/redux-types';

// This is lifted from redux-persist/lib/constants.js
// I don't want to add redux-persist to the web/server bundles...
// import { REHYDRATE } from 'redux-persist';
const REHYDRATE = 'persist/REHYDRATE';

class ReduxLogger {

  static n = 20;
  lastNActions = [];
  lastNStates = [];

  get preloadedState(): AppState {
    return this.lastNStates[0];
  }

  get actions(): Array<*> {
    return [...this.lastNActions];
  }

  addAction(action: *, state: AppState) {
    if (
      this.lastNActions.length > 0 &&
      this.lastNActions[this.lastNActions.length - 1].type === REHYDRATE
    ) {
      // redux-persist can't handle replaying REHYDRATE
      // https://github.com/rt2zz/redux-persist/issues/743
      this.lastNActions = [];
      this.lastNStates = [];
    }
    if (this.lastNActions.length === ReduxLogger.n) {
      this.lastNActions.shift();
      this.lastNStates.shift();
    }
    this.lastNActions.push(action);
    this.lastNStates.push(state);
  }

}

const reduxLogger = new ReduxLogger();

const reduxLoggerMiddleware = (store: *) => (next: *) => (action: *) => {
  // We want the state before the action
  const state = store.getState();
  reduxLogger.addAction(action, state);
  return next(action);
};

export {
  reduxLogger,
  reduxLoggerMiddleware,
};
