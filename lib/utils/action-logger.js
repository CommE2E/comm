// @flow

import { rehydrateActionType } from '../types/redux-types';
import type { ActionSummary } from '../types/report-types';

import inspect from 'util-inspect';

import { saveDraftActionType } from '../actions/miscellaneous-action-types';
import { sanitizeAction } from './sanitization';

const uninterestingActionTypes = new Set([
  saveDraftActionType,
  'Navigation/COMPLETE_TRANSITION',
]);
const maxActionSummaryLength = 500;

class ActionLogger {
  static n = 30;
  lastNActions = [];
  lastNStates = [];
  currentReduxState = undefined;
  currentOtherStates = {};

  get preloadedState(): Object {
    return this.lastNStates[0].state;
  }

  get actions(): Object[] {
    return this.lastNActions.map(({ action }) => action);
  }

  get interestingActionSummaries(): ActionSummary[] {
    return this.lastNActions
      .filter(({ action }) => !uninterestingActionTypes.has(action.type))
      .map(({ action, time }) => ({
        type: action.type,
        time,
        summary: ActionLogger.getSummaryForAction(action),
      }));
  }

  static getSummaryForAction(action: Object): string {
    const sanitized = sanitizeAction(action);
    let summary,
      length,
      depth = 3;
    do {
      summary = inspect(sanitized, { depth });
      length = summary.length;
      depth--;
    } while (length > maxActionSummaryLength && depth > 0);
    return summary;
  }

  prepareForAction() {
    if (
      this.lastNActions.length > 0 &&
      this.lastNActions[this.lastNActions.length - 1].action.type ===
        rehydrateActionType
    ) {
      // redux-persist can't handle replaying REHYDRATE
      // https://github.com/rt2zz/redux-persist/issues/743
      this.lastNActions = [];
      this.lastNStates = [];
    }
    if (this.lastNActions.length === ActionLogger.n) {
      this.lastNActions.shift();
      this.lastNStates.shift();
    }
  }

  addReduxAction(action: Object, beforeState: Object, afterState: Object) {
    this.prepareForAction();

    if (this.currentReduxState === undefined) {
      for (let i = 0; i < this.lastNStates.length; i++) {
        this.lastNStates[i] = {
          ...this.lastNStates[i],
          state: {
            ...this.lastNStates[i].state,
            ...beforeState,
          },
        };
      }
    }
    this.currentReduxState = afterState;

    const state = { ...beforeState };
    for (let stateKey in this.currentOtherStates) {
      state[stateKey] = this.currentOtherStates[stateKey];
    }

    const time = Date.now();
    this.lastNActions.push({ action, time });
    this.lastNStates.push({ state, time });
  }

  addOtherAction(
    key: string,
    action: Object,
    beforeState: Object,
    afterState: Object,
  ) {
    this.prepareForAction();

    const currentState = this.currentOtherStates[key];
    if (currentState === undefined) {
      for (let i = 0; i < this.lastNStates.length; i++) {
        this.lastNStates[i] = {
          ...this.lastNStates[i],
          state: {
            ...this.lastNStates[i].state,
            [key]: beforeState,
          },
        };
      }
    }
    this.currentOtherStates[key] = afterState;

    const state = {
      ...this.currentState,
      [key]: beforeState,
    };

    const time = Date.now();
    this.lastNActions.push({ action, time });
    this.lastNStates.push({ state, time });
  }

  get mostRecentActionTime(): ?number {
    if (this.lastNActions.length === 0) {
      return null;
    }
    return this.lastNActions[this.lastNActions.length - 1].time;
  }

  get currentState(): Object {
    const state = this.currentReduxState ? { ...this.currentReduxState } : {};
    for (let stateKey in this.currentOtherStates) {
      state[stateKey] = this.currentOtherStates[stateKey];
    }
    return state;
  }
}

const actionLogger = new ActionLogger();

const reduxLoggerMiddleware = (store: *) => (next: *) => (action: *) => {
  const beforeState = store.getState();
  const result = next(action);
  const afterState = store.getState();
  actionLogger.addReduxAction(action, beforeState, afterState);
  return result;
};

export { actionLogger, reduxLoggerMiddleware };
