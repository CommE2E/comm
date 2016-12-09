// @flow

import 'babel-polyfill';

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './calendar/entry-info';
import type { AppState } from './redux-reducer';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { Router, Route } from 'react-router';

import reducer from './redux-reducer';
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
declare var entry_infos: {[day: string]: {[id: string]: EntryInfo}};
declare var month: number;
declare var year: number;
declare var verify_code: ?string;
declare var verify_field: ?number;
declare var reset_password_username: string;
declare var home: bool;
declare var calendar_id: ?string;

const sessionID = Math.floor(0x80000000 * Math.random()).toString(36);
const store = createStore(
  reducer,
  ({
    navInfo: {
      year: year,
      month: month,
      home: home,
      calendarID: calendar_id,
      verify: verify_code,
    },
    loggedIn: !!email,
    username: username,
    email: email,
    emailVerified: email_verified,
    sessionID: sessionID,
    verifyField: verify_field,
    resetPasswordUsername: reset_password_username,
    entryInfos: entry_infos,
    calendarInfos: calendar_infos,
    newCalendarID: null,
    entriesLoadingStatus: "inactive",
  }: AppState),
);

ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Route
        path="*"
        component={App}
        onEnter={redirectURLFromInitialReduxState(store)}
        onChange={redirectURLFromAppTransition(store)}
      />
    </Router>
  </Provider>,
  document.getElementById('react-root'),
);
