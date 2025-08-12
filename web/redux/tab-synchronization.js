// @flow

import type { Middleware, Store } from 'redux';

import type { Action, AppState } from './redux-setup.js';

const WEB_REDUX_CHANNEL = new BroadcastChannel('shared-redux');

const tabSynchronizationMiddleware: Middleware<AppState, Action> =
  () => next => action => {
    const result = next(action);
    if (action.dispatchSource === 'tunnelbroker') {
      WEB_REDUX_CHANNEL.postMessage(action);
    }
    return result;
  };

function synchronizeStoreWithOtherTabs(store: Store<AppState, Action>) {
  WEB_REDUX_CHANNEL.onmessage = event => {
    // We can be sure that we only pass actions through the broadcast channel.
    // Additionally we know that this is one of the actions that contains the
    // `dispatchSource` field.
    const action: Action = ({
      ...event.data,
      dispatchSource: 'tab-sync',
    }: any);
    store.dispatch(action);
  };
}

export { tabSynchronizationMiddleware, synchronizeStoreWithOtherTabs };
