// @flow

import 'babel-polyfill';

import type { SquadInfo } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import type { AppState } from './redux-reducer';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { Router, Route } from 'react-router';
import createBrowserHistory from 'history/lib/createBrowserHistory';
import useBasename from 'history/lib/useBasename';

import App from './app.react';
import reducer from './redux-reducer';

declare var username: string;
declare var email: string;
declare var email_verified: bool;
declare var squad_infos: {[id: string]: SquadInfo};
declare var entry_infos: {[day: string]: {[id: string]: EntryInfo}};
declare var month: number;
declare var year: number;
declare var base_url: string;
declare var show: string;
declare var verify: string;
declare var reset_password_username: string;
declare var home: ?bool;
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
  }: AppState),
);

const history = useBasename(createBrowserHistory)({ basename: base_url });
ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Route
        path="/"
        component={App}
      />
      <Route
        path="(home/)(squad/:squadID/)(year/:year/)(month/:month/)"
        component={App}
      />
    </Router>
  </Provider>,
  document.getElementById('react-root'),
);
