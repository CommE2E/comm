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
import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { newSessionID } from 'lib/selectors/session-selectors';

import { reducer } from './redux-setup';

import App from './app.react';
import history from './router-history';

declare var username: string;
declare var email: string;
declare var email_verified: bool;
declare var thread_infos: {[id: string]: CalendarInfo};
declare var entry_infos: EntryInfo[];
declare var month: number;
declare var year: number;
declare var verify_code: ?string;
declare var verify_field: ?number;
declare var reset_password_username: string;
declare var home: bool;
declare var thread_id: ?string;

registerConfig({
  // We can use paths local to the <base href> on web
  urlPrefix: "",
  // We can't securely cache credentials on web, so we have no way to recover
  // from a cookie invalidation
  resolveInvalidatedCookie: null,
  // We use httponly cookies on web to protect against XSS attacks, so we have
  // no access to the cookies from JavaScript
  getNewCookie: null,
  // Never reset the calendar range
  calendarRangeInactivityLimit: null,
});

const userInfo = email
  ? { username, email, emailVerified: email_verified }
  : null;
const entryInfos = _keyBy('id')(entry_infos);
const daysToEntries = daysToEntriesFromEntryInfos(entry_infos);
const startDate = startDateForYearAndMonth(year, month);
const endDate = endDateForYearAndMonth(year, month);

const store: Store<AppState, Action> = createStore(
  reducer,
  ({
    navInfo: {
      startDate,
      endDate,
      home,
      threadID: thread_id,
      verify: verify_code,
    },
    userInfo,
    sessionID: newSessionID(),
    verifyField: verify_field ? assertVerifyField(verify_field) : verify_field,
    resetPasswordUsername: reset_password_username,
    entryInfos,
    daysToEntries,
    lastUserInteraction: { calendar: Date.now(), sessionReset: Date.now() },
    calendarInfos: thread_infos,
    loadingStatuses: {},
    cookie: undefined,
  }: AppState),
  composeWithDevTools({})(applyMiddleware(thunk)),
);

const render = (Component) => ReactDOM.render(
  <AppContainer>
    <Provider store={store}>
      <Router history={history}>
        <Route path="*" component={Component} />
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
