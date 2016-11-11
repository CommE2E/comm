// @flow

import type { SquadInfo } from './squad-info';
import { squadInfoPropType } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import { entryInfoPropType } from './calendar/entry-info';

import React from 'react';
import invariant from 'invariant';
import url from 'url';
import dateFormat from 'dateformat';

import ModalManager from './modals/modal-manager.react';
import AccountBar from './account-bar.react';
import Typeahead from './typeahead/typeahead.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerifyEmailModal from './modals/account/verify-email-modal.react';
import VerificationSuccessModal
  from './modals/account/verification-success-modal.react';
import { getDate } from './date-utils';

type Props = {
  thisURL: string,
  baseURL: string,
  monthURL: string,
  currentNavID: string,
  currentNavName: string,
  loggedIn: bool,
  username: string,
  email: string,
  emailVerified: bool,
  sessionID: string,
  year: number,
  month: number, // 1-indexed
  show: string,
  verifyCode: string,
  resetPasswordUsername: string,
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  squadInfos: {[id: string]: SquadInfo},
};

class App extends React.Component {

  props: Props;
  modalManager: ?ModalManager;

  componentDidMount() {
    if (this.props.show === 'reset_password') {
      this.setModal(
        <ResetPasswordModal
          thisURL={this.props.thisURL}
          resetPasswordUsername={this.props.resetPasswordUsername}
          verifyCode={this.props.verifyCode}
        />
      );
    } else if (this.props.show === 'verify_email') {
      this.setModal(
        <VerifyEmailModal
          onClose={this.clearModal.bind(this)}
        />
      );
    } else if (this.props.show === 'verified_email') {
      this.setModal(
        <VerificationSuccessModal
          onClose={this.clearModal.bind(this)}
        />
      );
    }
  }

  render() {
    const parsedURL = url.parse(this.props.thisURL, true);
    const query = parsedURL.query;
    const urlObj = {
      protocol: parsedURL.protocol,
      host: parsedURL.host,
      pathname: parsedURL.pathname,
    };
    invariant(query, "query string should be defined");

    const lastMonthDate = getDate(this.props.year, this.props.month - 1, 1);
    query.month = lastMonthDate.getMonth() + 1;
    query.year = lastMonthDate.getFullYear();
    const prevURL = url.format({ ...urlObj, query: query });

    const nextMonthDate = getDate(this.props.year, this.props.month + 1, 1);
    query.month = nextMonthDate.getMonth() + 1;
    query.year = nextMonthDate.getFullYear();
    const nextURL = url.format({ ...urlObj, query: query });

    const monthName = dateFormat(
      getDate(this.props.year, this.props.month, 1),
      "mmmm",
    );

    return (
      <div>
        <header>
          <h1>SquadCal</h1>
          <div className="upper-right">
            <Typeahead
              thisURL={this.props.thisURL}
              baseURL={this.props.baseURL}
              monthURL={this.props.monthURL}
              currentNavID={this.props.currentNavID}
              currentNavName={this.props.currentNavName}
              squadInfos={this.props.squadInfos}
              loggedIn={this.props.loggedIn}
              setModal={this.setModal.bind(this)}
              clearModal={this.clearModal.bind(this)}
            />
          </div>
          <div className="lower-left">
            <AccountBar
              thisURL={this.props.thisURL}
              monthURL={this.props.monthURL}
              loggedIn={this.props.loggedIn}
              username={this.props.username}
              email={this.props.email}
              emailVerified={this.props.emailVerified}
              setModal={this.setModal.bind(this)}
              clearModal={this.clearModal.bind(this)}
            />
          </div>
          <h2 className="upper-center">
            <a href={prevURL}>&lt;</a>
            {" "}
            {monthName}
            {" "}
            {this.props.year}
            {" "}
            <a href={nextURL}>&gt;</a>
          </h2>
        </header>
        <Calendar
          thisURL={this.props.thisURL}
          baseURL={this.props.baseURL}
          currentNavID={this.props.currentNavID}
          sessionID={this.props.sessionID}
          year={this.props.year}
          month={this.props.month}
          entryInfos={this.props.entryInfos}
          squadInfos={this.props.squadInfos}
          setModal={this.setModal.bind(this)}
          clearModal={this.clearModal.bind(this)}
        />
        <ModalManager ref={(mm) => this.modalManager = mm} />
      </div>
    );
  }

  setModal(modal: React.Element<any>) {
    invariant(this.modalManager, "modalManager ref not set");
    this.modalManager.setModal(modal);
  }

  clearModal() {
    invariant(this.modalManager, "modalManager ref not set");
    this.modalManager.clearModal();
  }

}

App.propTypes = {
  thisURL: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string.isRequired,
  currentNavName: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  username: React.PropTypes.string.isRequired,
  email: React.PropTypes.string.isRequired,
  emailVerified: React.PropTypes.bool.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  show: React.PropTypes.string.isRequired,
  verifyCode: React.PropTypes.string.isRequired,
  resetPasswordUsername: React.PropTypes.string.isRequired,
  entryInfos: React.PropTypes.objectOf(
    React.PropTypes.objectOf(entryInfoPropType),
  ).isRequired,
  squadInfos: React.PropTypes.objectOf(squadInfoPropType).isRequired,
};

export default App;
