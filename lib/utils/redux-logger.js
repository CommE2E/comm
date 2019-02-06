// @flow

import {
  type AppState,
  type BaseAction,
  rehydrateActionType,
} from '../types/redux-types';
import type { ActionSummary } from '../types/report-types';

import inspect from 'util-inspect';

import { saveDraftActionType } from '../actions/miscellaneous-action-types';
import { sanitizeAction } from './sanitization';

const uninterestingActionTypes = new Set([
  saveDraftActionType,
  "Navigation/COMPLETE_TRANSITION",
]);
const maxActionSummaryLength = 500;

class ReduxLogger {

  static n = 30;
  lastNActions = [];
  lastNStates = [];

  get preloadedState(): AppState {
    return this.lastNStates[0].state;
  }

  get actions(): BaseAction[] {
    return this.lastNActions.map(({ action }) => action);
  }

  get interestingActionSummaries(): ActionSummary[] {
    return this.lastNActions
      .filter(({ action }) => !uninterestingActionTypes.has(action.type))
      .map(({ action, time }) => ({
        type: action.type,
        time,
        summary: ReduxLogger.getSummaryForAction(action),
      }));
  }

  static getSummaryForAction(action: BaseAction): string {
    const sanitized = sanitizeAction(action);
    let summary, length, depth = 3;
    do {
      summary = inspect(action, { depth });
      length = summary.length;
      depth--;
    } while (length > maxActionSummaryLength && depth > 0);
    return summary;
  }

  addAction(action: BaseAction, state: AppState) {
    const time = Date.now();
    const actionWithTime = { action, time };
    const stateWithTime = { state, time };
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
    this.lastNActions.push(actionWithTime);
    this.lastNStates.push(stateWithTime);
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
