// @flow

import 'babel-polyfill';
import 'isomorphic-fetch';

import type { Store } from 'redux';
import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { AppState, Action } from './redux-setup';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { Router, Route } from 'react-router';
import { AppContainer } from 'react-hot-loader';
import thunk from 'redux-thunk';
import {
  composeWithDevTools,
} from 'redux-devtools-extension/logOnlyInProduction';
import _keyBy from 'lodash/fp/keyBy';

import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { registerConfig } from 'lib/utils/config';
import { assertVerifyField } from 'lib/utils/verify-utils';

import { reducer } from './redux-setup';

import App from './app.react';
import history from './router-history';
import {
  redirectURLFromInitialReduxState,
  redirectURLFromAppTransition,
} from './url-utils';

declare var username: string;
declare var email: string;
declare var email_verified: bool;
declare var calendar_infos: {[id: string]: CalendarInfo};
declare var entry_infos: EntryInfo[];
declare var month: number;
declare var year: number;
declare var verify_code: ?string;
declare var verify_field: ?number;
declare var reset_password_username: string;
declare var home: bool;
declare var calendar_id: ?string;

registerConfig({ urlPrefix: "" });

const sessionID = Math.floor(0x80000000 * Math.random()).toString(36);
const userInfo = email
  ? { username, email, emailVerified: email_verified }
  : null;
const entryInfos = _keyBy('id')(entry_infos);
const daysToEntries = daysToEntriesFromEntryInfos(entry_infos);

const store: Store<AppState, Action> = createStore(
  reducer,
  ({
    navInfo: {
      year: year,
      month: month,
      home: home,
      calendarID: calendar_id,
      verify: verify_code,
    },
    userInfo,
    sessionID: sessionID,
    verifyField: verify_field ? assertVerifyField(verify_field) : verify_field,
    resetPasswordUsername: reset_password_username,
    entryInfos,
    daysToEntries,
    calendarInfos: calendar_infos,
    loadingStatuses: {},
    cookie: undefined,
  }: AppState),
  composeWithDevTools({})(applyMiddleware(thunk)),
);

const render = (Component) => ReactDOM.render(
  <AppContainer>
    <Provider store={store}>
      <Router history={history}>
        <Route
          path="*"
          component={Component}
          onEnter={redirectURLFromInitialReduxState(store)}
          onChange={redirectURLFromAppTransition(store)}
        />
      </Router>
    </Provider>
  </AppContainer>,
  document.getElementById('react-root'),
);
render(App);

declare var module: { hot?: {
  accept: (string, Function) => void,
} };
if (module.hot) {
  module.hot.accept('./app.react', () => render(App));
}
