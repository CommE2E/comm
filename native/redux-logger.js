// @flow

import type { AppState } from './redux-setup';

class ReduxLogger {

  static n = 20;
  lastNActions = [];
  lastNStates = [];

  get preloadedState(): AppState {
    return this.lastNStates[0];
  }

  addAction(action: *, state: AppState) {
    if (this.lastNActions.length === ReduxLogger.n) {
      this.lastNActions.shift();
      this.lastNStates.shift();
    }
    this.lastNActions.push(action);
    this.lastNStates.push(state);
  }

}

const reduxLogger = new ReduxLogger();

export default reduxLogger;
