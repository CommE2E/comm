// @flow

import type { SquadInfo } from './squad-info';
import { squadInfoPropType } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import { entryInfoPropType } from './calendar/entry-info';
import type { AppState, UpdateStore } from './redux-reducer';

import React from 'react';
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import _ from 'lodash';

import ModalManager from './modals/modal-manager.react';
import AccountBar from './account-bar.react';
import Typeahead from './typeahead/typeahead.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerifyEmailModal from './modals/account/verify-email-modal.react';
import VerificationSuccessModal
  from './modals/account/verification-success-modal.react';
import { getDate } from './date-utils';
import { urlForYearAndMonth, thisNavURLFragment } from './nav-utils';
import { mapStateToUpdateStore } from './redux-utils'

type Props = {
  thisNavURLFragment: string,
  year: number,
  month: number, // 1-indexed
  show: string,
  updateStore: UpdateStore,
  params: {
    year: string,
    month: string,
    splat: string,
  },
};

class App extends React.Component {

  props: Props;
  modalManager: ?ModalManager;

  componentDidMount() {
    console.log(this.props);
    if (this.props.show === 'reset_password') {
      this.setModal(
        <ResetPasswordModal />
      );
    } else if (this.props.show === 'verify_email') {
      this.setModal(
        <VerifyEmailModal onClose={this.clearModal.bind(this)} />
      );
    } else if (this.props.show === 'verified_email') {
      this.setModal(
        <VerificationSuccessModal onClose={this.clearModal.bind(this)} />
      );
    }
  }

  componentWillReceiveProps(newProps: Props) {
  }

  render() {
    const lastMonthDate = getDate(this.props.year, this.props.month - 1, 1);
    const prevURL = this.props.thisNavURLFragment + urlForYearAndMonth(
      lastMonthDate.getFullYear(),
      lastMonthDate.getMonth() + 1,
    );
    const nextMonthDate = getDate(this.props.year, this.props.month + 1, 1);
    const nextURL = this.props.thisNavURLFragment + urlForYearAndMonth(
      nextMonthDate.getFullYear(),
      nextMonthDate.getMonth() + 1,
    );
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
              setModal={this.setModal.bind(this)}
              clearModal={this.clearModal.bind(this)}
            />
          </div>
          <div className="lower-left">
            <AccountBar
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
  thisNavURLFragment: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  show: React.PropTypes.string.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    thisNavURLFragment: thisNavURLFragment(state),
    year: state.navInfo.year,
    month: state.navInfo.month,
    show: state.show,
  }),
  mapStateToUpdateStore,
)(App);
