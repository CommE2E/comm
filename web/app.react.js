// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import type { AppState, NavInfo } from './redux-setup';
import { navInfoPropType } from './redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { EntryInfo } from 'lib/types/entry-types';
import type { VerifyField } from 'lib/utils/verify-utils';
import type { CalendarResult } from 'lib/actions/entry-actions';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';
import type { PingResult, PingStartingPayload } from 'lib/types/ping-types';

import React from 'react';
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import _isEqual from 'lodash/fp/isEqual';
import PropTypes from 'prop-types';
import Visibility from 'visibilityjs';

import { getDate } from 'lib/utils/date-utils';
import {
  currentNavID,
  currentCalendarQuery,
} from 'lib/selectors/nav-selectors';
import {
  fetchEntriesActionType,
  fetchEntries,
} from 'lib/actions/entry-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { verifyField } from 'lib/utils/verify-utils';
import { pingStartingPayload } from 'lib/selectors/ping-selectors';
import { pingActionType, ping } from 'lib/actions/ping-actions';

import {
  thisURL,
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
import {
  yearAssertingSelector,
  monthAssertingSelector,
} from './selectors/nav-selectors';

type Props = {
  location: {
    pathname: string,
  },
  // Redux state
  thisNavURLFragment: string,
  navInfo: NavInfo,
  verifyField: ?VerifyField,
  entriesLoadingStatus: LoadingStatus,
  currentNavID: ?string,
  thisURL: string,
  year: number,
  month: number,
  currentCalendarQuery: () => CalendarQuery,
  pingStartingPayload: () => PingStartingPayload,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  fetchEntries: (
    calendarQuery: CalendarQuery,
  ) => Promise<CalendarResult>,
  ping: (calendarQuery: CalendarQuery) => Promise<PingResult>,
};
type State = {
  // In null state cases, currentModal can be set to something, but modalExists
  // will be false. This is because we need to know if a modal is overlaid over
  // the null state
  modalExists: bool,
  currentModal: ?React.Element<any>,
};

// We can't push yet, so we rely on pings to keep Redux state updated with the
// server. As a result, we do them fairly frequently (once every 3s) while the
// tab has focus.
const pingFrequency = 3 * 1000;

class App extends React.PureComponent {

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
      if (this.props.verifyField === verifyField.RESET_PASSWORD) {
        this.showResetPasswordModal();
      } else if (this.props.verifyField === verifyField.EMAIL) {
        history.replace(`/${this.props.thisURL}`);
        this.setModal(
          <VerificationSuccessModal onClose={this.clearModal} />
        );
      }
    }
    const newURL = canonicalURLFromReduxState(
      this.props.navInfo,
      this.props.location.pathname,
    );
    if (this.props.location.pathname !== newURL) {
      history.replace(newURL);
    }
    Visibility.every(pingFrequency, this.ping);
  }

  ping = () => {
    const startingPayload = this.props.pingStartingPayload();
    this.props.dispatchActionPromise(
      pingActionType,
      this.pingAction(startingPayload),
      undefined,
      startingPayload,
    );
  }

  async pingAction(startingPayload: PingStartingPayload) {
    const pingResult = await this.props.ping(startingPayload.calendarQuery);
    return {
      ...pingResult,
      loggedIn: startingPayload.loggedIn,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.verifyField === verifyField.RESET_PASSWORD) {
      if (prevProps.navInfo.verify && !this.props.navInfo.verify) {
        this.clearModal();
      } else if (!prevProps.navInfo.verify && this.props.navInfo.verify) {
        this.showResetPasswordModal();
      }
    }
  }

  showResetPasswordModal() {
    const onClose = () => history.push(`/${this.props.thisURL}`);
    const onSuccess = () => history.replace(`/${this.props.thisURL}`);
    this.setModal(
      <ResetPasswordModal onClose={onClose} onSuccess={onSuccess} />
    );
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.location.pathname !== this.props.location.pathname) {
      const newNavInfo = navInfoFromURL(newProps.location.pathname);
      if (!newNavInfo.home && !newNavInfo.calendarID) {
        const strippedPathname = newProps.location.pathname.replace(/^\//, '');
        history.replace(`/${this.props.thisNavURLFragment}${strippedPathname}`);
        newNavInfo.home = newProps.navInfo.home;
        newNavInfo.calendarID = newProps.navInfo.calendarID;
      }
      if (!_isEqual(newNavInfo, newProps.navInfo)) {
        this.props.dispatchActionPayload("REFLECT_ROUTE_CHANGE", newNavInfo);
      }
    } else if (!_isEqual(newProps.navInfo, this.props.navInfo)) {
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
        newProps.navInfo.startDate !== this.props.navInfo.startDate ||
        newProps.navInfo.endDate !== this.props.navInfo.endDate)
    ) {
      newProps.dispatchActionPromise(
        fetchEntriesActionType,
        newProps.fetchEntries(newProps.currentCalendarQuery()),
      );
    }
  }

  render() {
    const year = this.props.year;
    const month = this.props.month;
    const lastMonthDate = getDate(year, month - 1, 1);
    const prevURL = "/" + this.props.thisNavURLFragment + urlForYearAndMonth(
      lastMonthDate.getFullYear(),
      lastMonthDate.getMonth() + 1,
    );
    const nextMonthDate = getDate(year, month + 1, 1);
    const nextURL = "/" + this.props.thisNavURLFragment + urlForYearAndMonth(
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
              setModal={this.setModal}
              clearModal={this.clearModal}
              modalExists={this.state.modalExists}
            />
          </div>
          <AccountBar
            setModal={this.setModal}
            clearModal={this.clearModal}
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
          setModal={this.setModal}
          clearModal={this.clearModal}
        />
        {this.state.currentModal}
      </div>
    );
  }

  setModal = (modal: React.Element<any>) => {
    this.setState({
      currentModal: modal,
      modalExists: true,
    });
  }

  clearModal = () => {
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
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
  thisNavURLFragment: PropTypes.string.isRequired,
  navInfo: navInfoPropType.isRequired,
  verifyField: PropTypes.number,
  entriesLoadingStatus: PropTypes.string.isRequired,
  currentNavID: PropTypes.string,
  thisURL: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  currentCalendarQuery: PropTypes.func.isRequired,
  pingStartingPayload: PropTypes.func.isRequired,
  dispatchActionPayload: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  fetchEntries: PropTypes.func.isRequired,
  ping: PropTypes.func.isRequired,
};

const loadingStatusSelector
  = createLoadingStatusSelector(fetchEntriesActionType);

export default connect(
  (state: AppState) => ({
    thisNavURLFragment: thisNavURLFragment(state),
    navInfo: state.navInfo,
    verifyField: state.verifyField,
    entriesLoadingStatus: loadingStatusSelector(state),
    currentNavID: currentNavID(state),
    thisURL: thisURL(state),
    year: yearAssertingSelector(state),
    month: monthAssertingSelector(state),
    currentCalendarQuery: currentCalendarQuery(state),
    pingStartingPayload: pingStartingPayload(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps({
    dispatchActionPayload: true,
    dispatchActionPromise: true,
  }),
  bindServerCalls({ fetchEntries, ping }),
)(App);
