// @flow

import {
  type AppState,
  type BaseAction,
  rehydrateActionType,
} from '../types/redux-types';

import { saveDraftActionType } from '../actions/miscellaneous-action-types';

const uninterestingActionTypes = new Set([ saveDraftActionType ]);

class ReduxLogger {

  static n = 20;
  lastNActions = [];
  lastNStates = [];

  get preloadedState(): AppState {
    return this.lastNStates[0];
  }

  get actions(): BaseAction[] {
    return [...this.lastNActions];
  }

  get interestingActionTypes(): Array<$PropertyType<BaseAction, 'type'>> {
    return this.actions
      .map(action => action.type)
      .filter(type => !uninterestingActionTypes.has(type));
  }

  addAction(action: BaseAction, state: AppState) {
    if (
      this.lastNActions.length > 0 &&
      this.lastNActions[this.lastNActions.length - 1].type
        === rehydrateActionType
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
