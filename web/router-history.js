// @flow

import * as historyModule from 'history';
import invariant from 'invariant';

const { createBrowserHistory } = historyModule;

declare var baseURL: string;

// eslint-disable-next-line no-undef
const history = process.env.BROWSER
  ? createBrowserHistory({ basename: baseURL })
  : null;

export default {
  getHistoryObject: () => {
    invariant(
      history,
      "can't use history.getHistoryObject() during server rendering!",
    );
    return history;
  },
  push: (location: string) => {
    invariant(history, "can't use history.push() during server rendering!");
    return history.push(location);
  },
  replace: (location: string) => {
    invariant(history, "can't use history.replace() during server rendering!");
    return history.replace(location);
  },
};
