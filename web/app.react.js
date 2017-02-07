// @flow

// this plugin causes problems, and react-router has a better locationShape
'no babel-plugin-flow-react-proptypes';

import type { UpdateStore } from 'lib/model/redux-reducer';
import type { AppState, NavInfo } from './redux-types';
import { navInfoPropType } from './redux-types';
import type { LoadingStatus } from './loading-indicator.react';

import React from 'react';
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import { Link, locationShape } from 'react-router';
import _ from 'lodash';

import { getDate } from 'lib/utils/date-utils';
import { currentNavID, fetchEntriesAndUpdateStore } from 'lib/shared/nav-utils';
import { mapStateToUpdateStore } from 'lib/shared/redux-utils'
import {
  thisURL,
  monthURL,
  urlForYearAndMonth,
  thisNavURLFragment,
  canonicalURLFromReduxState,
  navInfoFromURL,
} from './url-utils';

import css from './style.css';
import AccountBar from './account-bar.react';
import Typeahead from './typeahead/typeahead.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerificationSuccessModal
  from './modals/account/verification-success-modal.react';
import LoadingIndicator from './loading-indicator.react';
import history from './router-history';
import IntroModal from './modals/intro-modal.react';

type Props = {
  thisNavURLFragment: string,
  navInfo: NavInfo,
  verifyField: ?number,
  updateStore: UpdateStore<AppState>,
  entriesLoadingStatus: LoadingStatus,
  currentNavID: ?string,
  thisURL: string,
  monthURL: string,
  location: {
    pathname: string,
  },
};
type State = {
  // In null state cases, currentModal can be set to something, but modalExists
  // will be false. This is because we need to know if a modal is overlaid over
  // the null state
  modalExists: bool,
  currentModal: ?React.Element<any>,
};

class App extends React.Component {

  static verifyEmail = 0;
  static resetPassword = 1;
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    let currentModal = null;
    if (!props.currentNavID) {
      if (props.navInfo.home) {
        currentModal = <IntroModal />;
      } else {
        currentModal = <div className={css['modal-overlay']} />;
      }
    }
    this.state = {
      modalExists: false,
      currentModal: currentModal,
    };
  }

  componentDidMount() {
    if (this.props.navInfo.verify) {
      if (this.props.verifyField === App.resetPassword) {
        this.showResetPasswordModal();
      } else if (this.props.verifyField === App.verifyEmail) {
        history.replace(this.props.thisURL);
        this.setModal(
          <VerificationSuccessModal onClose={this.clearModal.bind(this)} />
        );
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.verifyField === App.resetPassword) {
      if (prevProps.navInfo.verify && !this.props.navInfo.verify) {
        this.clearModal();
      } else if (!prevProps.navInfo.verify && this.props.navInfo.verify) {
        this.showResetPasswordModal();
      }
    }
  }

  showResetPasswordModal() {
    const onClose = () => history.push(this.props.thisURL);
    const onSuccess = () => history.replace(this.props.thisURL);
    this.setModal(
      <ResetPasswordModal onClose={onClose} onSuccess={onSuccess} />
    );
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.location.pathname !== this.props.location.pathname) {
      const newNavInfo = navInfoFromURL(newProps.location.pathname);
      if (!_.isEqual(newNavInfo, newProps.navInfo)) {
        const updateObj = _.mapValues(newNavInfo, val => ({ $set: val }));
        this.props.updateStore((prevState: AppState) => update(prevState, {
          navInfo: updateObj,
        }));
      }
    } else if (!_.isEqual(newProps.navInfo, this.props.navInfo)) {
      const newURL = canonicalURLFromReduxState(
        newProps.navInfo,
        newProps.location.pathname,
      );
      if (newURL !== newProps.location.pathname) {
        history.replace(newURL);
      }
    }

    if (!this.state.modalExists) {
      let newModal = undefined;
      if (
        (newProps.navInfo.home && !newProps.currentNavID) &&
        (!this.props.navInfo.home || this.props.currentNavID)
      ) {
        newModal = <IntroModal />;
      } else if (
        (newProps.navInfo.calendarID && !newProps.currentNavID) &&
        (!this.props.navInfo.calendarID || this.props.currentNavID)
      ) {
        newModal = <div className={css['modal-overlay']} />;
      } else if (newProps.currentNavID && !this.props.currentNavID) {
        newModal = null;
      }
      if (newModal !== undefined) {
        this.setState({ currentModal: newModal });
      }
    }

    if (
      newProps.currentNavID &&
      (newProps.currentNavID !== this.props.currentNavID ||
        newProps.navInfo.year !== this.props.navInfo.year ||
        newProps.navInfo.month !== this.props.navInfo.month)
    ) {
      fetchEntriesAndUpdateStore(
        newProps.navInfo.year,
        newProps.navInfo.month,
        newProps.currentNavID,
        newProps.updateStore,
      ).then();
    }
  }

  render() {
    const year = this.props.navInfo.year;
    const month = this.props.navInfo.month;
    const lastMonthDate = getDate(year, month - 1, 1);
    const prevURL = this.props.thisNavURLFragment + urlForYearAndMonth(
      lastMonthDate.getFullYear(),
      lastMonthDate.getMonth() + 1,
    );
    const nextMonthDate = getDate(year, month + 1, 1);
    const nextURL = this.props.thisNavURLFragment + urlForYearAndMonth(
      nextMonthDate.getFullYear(),
      nextMonthDate.getMonth() + 1,
    );
    const monthName = dateFormat(getDate(year, month, 1), "mmmm");
    return (
      <div>
        <header>
          <h1>SquadCal</h1>
          <div className={css['upper-right']}>
            <LoadingIndicator
              status={this.props.entriesLoadingStatus}
              className={css['page-loading']}
            />
            <Typeahead
              setModal={this.setModal.bind(this)}
              clearModal={this.clearModal.bind(this)}
              modalExists={this.state.modalExists}
            />
          </div>
          <AccountBar
            setModal={this.setModal.bind(this)}
            clearModal={this.clearModal.bind(this)}
            modalExists={this.state.modalExists}
          />
          <h2 className={css['upper-center']}>
            <Link to={prevURL} className={css['previous-month-link']}>
              &lt;
            </Link>
            {" "}
            {monthName}
            {" "}
            {year}
            {" "}
            <Link to={nextURL} className={css['next-month-link']}>
              &gt;
            </Link>
          </h2>
        </header>
        <Calendar
          setModal={this.setModal.bind(this)}
          clearModal={this.clearModal.bind(this)}
        />
        {this.state.currentModal}
      </div>
    );
  }

  setModal(modal: React.Element<any>) {
    this.setState({
      currentModal: modal,
      modalExists: true,
    });
  }

  clearModal() {
    let currentModal = null;
    if (!this.props.currentNavID && this.props.navInfo.home) {
      currentModal = <IntroModal />;
    } else if (!this.props.currentNavID) {
      currentModal = <div className={css['modal-overlay']} />;
    }
    this.setState({
      currentModal,
      modalExists: false,
    });
  }

}

App.propTypes = {
  thisNavURLFragment: React.PropTypes.string.isRequired,
  navInfo: navInfoPropType.isRequired,
  verifyField: React.PropTypes.number,
  updateStore: React.PropTypes.func.isRequired,
  entriesLoadingStatus: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string,
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  location: locationShape,
};

export default connect(
  (state: AppState) => ({
    thisNavURLFragment: thisNavURLFragment(state),
    navInfo: state.navInfo,
    verifyField: state.verifyField,
    entriesLoadingStatus: state.entriesLoadingStatus,
    currentNavID: currentNavID(state),
    thisURL: thisURL(state),
    monthURL: monthURL(state),
  }),
  mapStateToUpdateStore,
)(App);
