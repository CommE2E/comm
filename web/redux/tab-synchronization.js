// @flow

import type { Middleware, Store, Dispatch } from 'redux';

import type { Action, AppState } from './redux-setup.js';

const WEB_REDUX_CHANNEL = new BroadcastChannel('shared-redux');

const tabSynchronizationMiddleware: Middleware<AppState, Action> =
  () => (next: Dispatch<Action>) => (action: Action) => {
    const result = next(action);
    // For now the `dispatchSource` field is not included in any of the
    // redux actions and this causes flow to throw an error.
    // As soon as one of the actions is updated, this fix (and the corresponding
    // one in redux-setup.js) can be removed.
    // $FlowFixMe
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
