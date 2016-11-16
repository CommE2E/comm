// @flow

import 'babel-polyfill';

import type { SquadInfo } from './squad-info';
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
declare var squad_infos: {[id: string]: SquadInfo};
declare var entry_infos: {[day: string]: {[id: string]: EntryInfo}};
declare var month: number;
declare var year: number;
declare var show: string;
declare var verify: string;
declare var reset_password_username: string;
declare var home: bool;
declare var squad_id: ?string;

const sessionID = Math.floor(0x80000000 * Math.random()).toString(36);
const store = createStore(
  reducer,
  ({
    navInfo: {
      year: year,
      month: month,
      home: home,
      squadID: squad_id,
      entriesLoadingStatus: "inactive",
    },
    loggedIn: !!email,
    username: username,
    email: email,
    emailVerified: email_verified,
    sessionID: sessionID,
    show: show,
    verifyCode: verify,
    resetPasswordUsername: reset_password_username,
    entryInfos: entry_infos,
    squadInfos: squad_infos,
    newSquadID: null,
  }: AppState),
);

// Warning: our root index route resolution only works on load. For one,
// thisNavURLFragment's inputs don't get updated when the Redux store changes.
// But the real reason we do it this way is that we want to enforce the
// condition (home || squadID) for simplicity. We could probably get around the
// former issue using react-router's onEnter. Note that having the route config
// itself be a Redux container isn't supported by react-router.
ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Redirect from="/" to={thisNavURLFragment(store.getState())} />
      <Route
        path="(home/)(squad/:squadID/)(year/:year/)(month/:month/)"
        component={App}
      />
    </Router>
  </Provider>,
  document.getElementById('react-root'),
);
