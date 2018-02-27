// @flow

import createBrowserHistory from 'history/createBrowserHistory';
import invariant from 'invariant';

declare var baseURL: string;
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
