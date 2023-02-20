// @flow

import { type Middleware } from 'redux';
import inspect from 'util-inspect';

import { sanitizeActionSecrets } from './sanitization.js';
import { rehydrateActionType } from '../types/redux-types.js';
import type { ActionSummary } from '../types/report-types.js';

const uninterestingActionTypes = new Set(['Navigation/COMPLETE_TRANSITION']);
const maxActionSummaryLength = 500;

type Subscriber = (action: Object, state: Object) => void;

class ActionLogger {
  static n: number = 30;
  lastNActions: Array<{ +action: Object, +time: number }> = [];
  lastNStates: Array<{ +state: Object, +time: number }> = [];
  currentReduxState: Object = undefined;
  currentOtherStates: { [key: string]: Object } = {};
  subscribers: Subscriber[] = [];

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
    const sanitized = sanitizeActionSecrets(action);
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
    for (const stateKey in this.currentOtherStates) {
      state[stateKey] = this.currentOtherStates[stateKey];
    }

    const time = Date.now();
    this.lastNActions.push({ action, time });
    this.lastNStates.push({ state, time });

    this.triggerSubscribers(action);
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

    this.triggerSubscribers(action);
  }

  get mostRecentActionTime(): ?number {
    if (this.lastNActions.length === 0) {
      return null;
    }
    return this.lastNActions[this.lastNActions.length - 1].time;
  }

  get currentState(): Object {
    const state = this.currentReduxState ? { ...this.currentReduxState } : {};
    for (const stateKey in this.currentOtherStates) {
      state[stateKey] = this.currentOtherStates[stateKey];
    }
    return state;
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.push(subscriber);
  }

  unsubscribe(subscriber: Subscriber) {
    this.subscribers = this.subscribers.filter(
      candidate => candidate !== subscriber,
    );
  }

  triggerSubscribers(action: Object) {
    if (uninterestingActionTypes.has(action.type)) {
      return;
    }
    const state = this.currentState;
    this.subscribers.forEach(subscriber => subscriber(action, state));
  }
}

const actionLogger: ActionLogger = new ActionLogger();

const reduxLoggerMiddleware: Middleware<Object, Object> =
  store => next => action => {
    const beforeState = store.getState();
    const result = next(action);
    const afterState = store.getState();
    actionLogger.addReduxAction(action, beforeState, afterState);
    return result;
  };

export { actionLogger, reduxLoggerMiddleware };
