// @flow

import {
  type ConnectionInfo,
  connectionInfoPropType,
} from '../types/socket-types';
import type { BaseAppState } from '../types/redux-types';
import {
  type CalendarQuery,
  calendarQueryPropType,
  type CalendarQueryUpdateResult,
  type CalendarQueryUpdateStartingPayload,
} from '../types/entry-types';
import type { DispatchActionPromise } from '../utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';
import _isEqual from 'lodash/fp/isEqual';

import { connect } from '../utils/redux-utils';
import {
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
} from '../actions/entry-actions';
import {
  currentCalendarQuery,
  timeUntilCalendarRangeExpiration,
} from '../selectors/nav-selectors';
import { getConfig } from '../utils/config';

type Props = {|
  // Redux state
  connection: ConnectionInfo,
  currentCalendarQuery: () => CalendarQuery,
  lastUserInteractionCalendar: number,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  updateCalendarQuery: (
    calendarQuery: CalendarQuery,
    reduxAlreadyUpdated?: bool,
  ) => Promise<CalendarQueryUpdateResult>,
|};
class CalendarQueryHandler extends React.PureComponent<Props> {

  static propTypes = {
    connection: connectionInfoPropType.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    lastUserInteractionCalendar: PropTypes.number.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateCalendarQuery: PropTypes.func.isRequired,
  };
  expirationTimeoutID: ?TimeoutID;

  componentDidMount() {
    if (this.props.connection.status !== "connected") {
      return;
    }
    const justUpdated = this.possiblyUpdateCalendarQuery();
    this.setExpirationTimeout(justUpdated);
  }

  componentWillUnmount() {
    this.clearExpirationTimeout();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.connection.status !== "connected") {
      this.clearExpirationTimeout();
      return;
    }
    let justUpdated = false;
    if (
      prevProps.connection.status !== "connected" ||
      this.props.currentCalendarQuery !== prevProps.currentCalendarQuery
    ) {
      justUpdated = this.possiblyUpdateCalendarQuery();
    }
    if (
      prevProps.connection.status !== "connected" ||
      this.props.lastUserInteractionCalendar !==
        prevProps.lastUserInteractionCalendar
    ) {
      this.setExpirationTimeout(justUpdated);
    }
  }

  render() {
    return null;
  }

  clearExpirationTimeout() {
    if (this.expirationTimeoutID) {
      clearTimeout(this.expirationTimeoutID);
      this.expirationTimeoutID = null;
    }
  }

  setExpirationTimeout(justUpdated: bool) {
    this.clearExpirationTimeout();
    const timeUntilExpiration =
      timeUntilCalendarRangeExpiration(this.props.lastUserInteractionCalendar);
    if (timeUntilExpiration === null || timeUntilExpiration === undefined) {
      return;
    }
    if (timeUntilExpiration <= 0) {
      if (!justUpdated) {
        this.possiblyUpdateCalendarQuery();
      }
    } else {
      this.expirationTimeoutID = setTimeout(
        this.possiblyUpdateCalendarQuery,
        timeUntilExpiration,
      );
    }
  }

  possiblyUpdateCalendarQuery = () => {
    if (this.props.connection.status !== "connected") {
      return false;
    }
    const calendarQuery = this.props.currentCalendarQuery();
    const { actualizedCalendarQuery } = this.props.connection;
    if (!_isEqual(calendarQuery)(actualizedCalendarQuery)) {
      this.props.dispatchActionPromise(
        updateCalendarQueryActionTypes,
        this.props.updateCalendarQuery(calendarQuery, true),
        undefined,
        ({ calendarQuery }: CalendarQueryUpdateStartingPayload),
      );
      return true;
    }
    return false;
  }

}


export default connect(
  (state: BaseAppState<*>) => ({
    connection: state.connection,
    currentCalendarQuery: currentCalendarQuery(state),
    lastUserInteractionCalendar: state.entryStore.lastUserInteractionCalendar
  }),
  { updateCalendarQuery },
)(CalendarQueryHandler);
