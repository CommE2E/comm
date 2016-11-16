// @flow

import 'babel-polyfill';

import type { SquadInfo } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import type { AppState } from './redux-reducer';

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import reducer from './redux-reducer';
import AppRouter from './app-router.react';

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
if (!home && !squad_id) {
  if (_.some(squad_infos, 'subscribed')) {
    home = true;
  } else {
    squad_id = "254";
  }
}

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
  }: AppState),
);

ReactDOM.render(
  <Provider store={store}><AppRouter /></Provider>,
  document.getElementById('react-root'),
);
