// @flow

import * as HistoryModule from 'history';
import invariant from 'invariant';
import type { RouterHistory, LocationShape } from 'react-router';

const { createBrowserHistory } = HistoryModule;

declare var baseURL: string;

type LocationType = LocationShape;
type HistoryObject = HistoryModule.History<LocationType> & RouterHistory;

const history: ?HistoryObject = process.env.BROWSER
  ? (createBrowserHistory({ basename: baseURL }): any)
  : null;

type History = {
  +getHistoryObject: () => HistoryObject,
  +push: (location: string) => void,
  +replace: (location: string) => void,
};

const routerHistory: History = {
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

export default routerHistory;
