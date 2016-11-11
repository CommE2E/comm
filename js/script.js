// @flow

import 'babel-polyfill';

import type { SquadInfo } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './app.react';

declare var username: string;
declare var email: string;
declare var email_verified: bool;
declare var squad_infos: {[id: string]: SquadInfo};
declare var entry_infos: {[day: string]: {[id: string]: EntryInfo}};
declare var month: number;
declare var year: number;
declare var month_url: string;
declare var this_url: string;
declare var base_url: string;
declare var show: string;
declare var verify: string;
declare var reset_password_username: string;
declare var original_nav: string;
declare var current_nav_name: string;

const sessionID = Math.floor(0x80000000 * Math.random()).toString(36);

ReactDOM.render(
  <App
    thisURL={this_url}
    baseURL={base_url}
    monthURL={month_url}
    currentNavID={original_nav}
    currentNavName={current_nav_name}
    loggedIn={!!email}
    username={username}
    email={email}
    emailVerified={email_verified}
    sessionID={sessionID}
    year={year}
    month={month}
    show={show}
    verifyCode={verify}
    resetPasswordUsername={reset_password_username}
    entryInfos={entry_infos}
    squadInfos={squad_infos}
  />,
  document.getElementById('react-root'),
);
