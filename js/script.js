// @flow

import 'babel-polyfill';

import type { SquadInfo } from './squad-info';
import { squadInfoPropType } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import { entryInfoPropType } from './calendar/entry-info';

import React from 'react';
import ReactDOM from 'react-dom';
import invariant from 'invariant';

import ModalManager from './modals/modal-manager.react';
import AccountBar from './account-bar.react';
import Typeahead from './typeahead/typeahead.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerifyEmailModal from './modals/account/verify-email-modal.react';
import VerificationSuccessModal
  from './modals/account/verification-success-modal.react';

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

let modalManager = null;
ReactDOM.render(
  <ModalManager ref={(mm) => modalManager = mm} />,
  document.getElementById('modal-manager-parent'),
);
invariant(modalManager !== null, "modalManager should be set");

ReactDOM.render(
  <AccountBar
    thisURL={this_url}
    monthURL={month_url}
    loggedIn={!!email}
    username={username}
    email={email}
    emailVerified={email_verified}
    setModal={modalManager.setModal.bind(modalManager)}
    clearModal={modalManager.clearModal.bind(modalManager)}
  />,
  document.getElementById('lower-left'),
);

ReactDOM.render(
  <Typeahead
    thisURL={this_url}
    baseURL={base_url}
    monthURL={month_url}
    currentNavID={original_nav}
    currentNavName={current_nav_name}
    squadInfos={squad_infos}
    loggedIn={!!email}
    setModal={modalManager.setModal.bind(modalManager)}
    clearModal={modalManager.clearModal.bind(modalManager)}
  />,
  document.getElementById('upper-right'),
);

ReactDOM.render(
  <Calendar
    thisURL={this_url}
    baseURL={base_url}
    navID={original_nav}
    sessionID={sessionID}
    year={year}
    month={month}
    entryInfos={entry_infos}
    squadInfos={squad_infos}
    setModal={modalManager.setModal.bind(modalManager)}
    clearModal={modalManager.clearModal.bind(modalManager)}
  />,
  document.getElementById('calendar'),
);

if (show === 'reset_password') {
  modalManager.setModal(
    <ResetPasswordModal
      thisURL={this_url}
      resetPasswordUsername={reset_password_username}
      verifyCode={verify}
    />
  );
} else if (show === 'verify_email') {
  modalManager.setModal(
    <VerifyEmailModal
      onClose={modalManager.clearModal.bind(modalManager)}
    />
  );
} else if (show === 'verified_email') {
  modalManager.setModal(
    <VerificationSuccessModal
      onClose={modalManager.clearModal.bind(modalManager)}
    />
  );
}
