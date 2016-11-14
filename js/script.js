// @flow

import 'babel-polyfill';

import type { SquadInfo } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import type { AppState } from './redux-reducer';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import { createStore } from 'redux'
//import { Router, Route, browserHistory } from 'react-router'

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
// Any changes here need to be synced with the state
const store = createStore(
  reducer,
  ({
    navInfo: {
      baseURL: base_url,
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

    //<Router history={browserHistory}>
    //</Router>
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('react-root'),
);
