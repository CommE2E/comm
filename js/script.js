// @flow

import 'babel-polyfill';

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './calendar/entry-info';
import type { AppState } from './redux-reducer';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { Router, Route, Redirect } from 'react-router';

import reducer from './redux-reducer';
import App from './app.react';
import history from './router-history';
import { thisNavURLFragment } from './nav-utils';

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
      entriesLoadingStatus: "inactive",
    },
    loggedIn: !!email,
    username: username,
    email: email,
    emailVerified: email_verified,
    sessionID: sessionID,
    verifyCode: verify_code,
    verifyField: verify_field,
    resetPasswordUsername: reset_password_username,
    entryInfos: entry_infos,
    calendarInfos: calendar_infos,
    newCalendarID: null,
  }: AppState),
);

// Okay, so the way Redux and react-router interact in this app is a bit complex
// and worth explaining. On the initial load, the navInfo in the Redux store is
// the ground truth for navigational state (rather than react-router's parsed
// route). The reason for this is that the user may have entered in a URL that
// needs to get redirected. In that case, the server returns the Redux state in
// the post-redirection state (so as to enable us to make certain guarantees
// about the Redux state at all times), but obviously the initial route is
// incorrect. The <Redirect> below looks at the Redux store to determine how to
// set the route, and the initial route replaced with one that is consistent
// with the Redux state.
//
// However, the normal propagation throughout the rest of the app's lifetime is
// reversed: the ground truth is in the react-router route, and this gets passed
// down to the <App> component, which then updates the Redux store.
// Consequently, to change the navigational state throughout the app, use
// the react-router history.push method. The reason for this is that actual
// back/forward browser events need to change Redux state, and our way of
// intercepting them is through react-router.
//
// Warning: our <Redirect> logic below only works on load. For one, the
// thisNavURLFragment call below only happens once, and consequently the
// <Redirect> doesn't get updated when the Redux store changes. In fact,
// changing route configs dynamically is not well supported in react-router
// anyways. If we ever need to support browser.push('/'), we could look into
// using react-router's onEnter method to do the redirect dynamically based on
// Redux state.
const navURLFragment = thisNavURLFragment(store.getState());
ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Redirect from="/" to={navURLFragment} />
      <Redirect
        from="/verify/:verify/"
        to={navURLFragment + "/verify/:verify/"}
      />
      <Route
        path={
          "(home/)(squad/:calendarID/)" +
          "(year/:year/)(month/:month/)" +
          "(verify/:verify/)"
        }
        component={App}
      />
    </Router>
  </Provider>,
  document.getElementById('react-root'),
);
