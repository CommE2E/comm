// @flow

import type { SquadInfo } from './squad-info';
import { squadInfoPropType } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';
import { entryInfoPropType } from './calendar/entry-info';
import type { AppState, UpdateStore } from './redux-reducer';
import type { LoadingStatus } from './loading-indicator.react';

import React from 'react';
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import { Link, locationShape } from 'react-router';

import ModalManager from './modals/modal-manager.react';
import AccountBar from './account-bar.react';
import Typeahead from './typeahead/typeahead.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerifyEmailModal from './modals/account/verify-email-modal.react';
import VerificationSuccessModal
  from './modals/account/verification-success-modal.react';
import { getDate } from './date-utils';
import {
  urlForYearAndMonth,
  thisNavURLFragment,
  currentNavID,
  fetchEntriesAndUpdateStore,
} from './nav-utils';
import { mapStateToUpdateStore } from './redux-utils'
import LoadingIndicator from './loading-indicator.react';

type Props = {
  thisNavURLFragment: string,
  year: number,
  month: number, // 1-indexed
  show: string,
  updateStore: UpdateStore,
  entriesLoadingStatus: LoadingStatus,
  currentNavID: string,
  params: {
    year: ?string,
    month: ?string,
    squadID: ?string,
  },
  location: {
    pathname: string,
  },
};

class App extends React.Component {

  props: Props;
  modalManager: ?ModalManager;

  componentDidMount() {
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
    const newHome = newProps.location.pathname.indexOf("home/") === 0;
    const newSquadID = newProps.params.squadID
      ? newProps.params.squadID
      : null;
    const updateObj: {[key: string]: mixed} = {
      home: { $set: newHome },
      squadID: { $set: newSquadID },
    };
    if (newProps.params.year) {
      updateObj.year = { $set: parseInt(newProps.params.year) };
    }
    if (newProps.params.month) {
      updateObj.month = { $set: parseInt(newProps.params.month) };
    }
    this.props.updateStore((prevState: AppState) => update(prevState, {
      navInfo: updateObj,
    }));
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
            <LoadingIndicator
              status={this.props.entriesLoadingStatus}
              // TODO error-handling stuff
              className="page-loading"
            />
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
            <Link
              to={prevURL}
              onClick={(event) => this.navigateTo(
                lastMonthDate.getFullYear(),
                lastMonthDate.getMonth() + 1,
              )}
              className="previous-month-link"
            >&lt;</Link>
            {" "}
            {monthName}
            {" "}
            {this.props.year}
            {" "}
            <Link
              to={nextURL}
              onClick={(event) => this.navigateTo(
                nextMonthDate.getFullYear(),
                nextMonthDate.getMonth() + 1,
              )}
              className="next-month-link"
            >&gt;</Link>
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

  async navigateTo(year: number, month: number) {
    await fetchEntriesAndUpdateStore(
      year,
      month,
      this.props.currentNavID,
      this.props.updateStore
    );
  }

}

App.propTypes = {
  thisNavURLFragment: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  show: React.PropTypes.string.isRequired,
  updateStore: React.PropTypes.func.isRequired,
  entriesLoadingStatus: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string.isRequired,
  params: React.PropTypes.shape({
    year: React.PropTypes.string,
    month: React.PropTypes.string,
    squadID: React.PropTypes.string,
  }),
  location: locationShape,
};

export default connect(
  (state: AppState) => ({
    thisNavURLFragment: thisNavURLFragment(state),
    year: state.navInfo.year,
    month: state.navInfo.month,
    show: state.show,
    entriesLoadingStatus: state.navInfo.entriesLoadingStatus,
    currentNavID: currentNavID(state),
  }),
  mapStateToUpdateStore,
)(App);
