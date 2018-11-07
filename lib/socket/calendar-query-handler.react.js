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
import { timeUntilCalendarRangeExpiration } from '../selectors/nav-selectors';
import { getConfig } from '../utils/config';

type Props = {|
  currentCalendarQuery: () => CalendarQuery,
  // Redux state
  connection: ConnectionInfo,
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
  serverCalendarQuery: CalendarQuery;
  expirationTimeoutID: ?TimeoutID;

  constructor(props: Props) {
    super(props);
    this.serverCalendarQuery = this.props.connection.actualizedCalendarQuery;
  }

  componentDidMount() {
    if (this.props.connection.status !== "connected") {
      return;
    }
    this.setExpirationTimeout();
    this.possiblyUpdateCalendarQuery();
  }

  componentWillUnmount() {
    this.clearExpirationTimeout();
  }

  componentDidUpdate(prevProps: Props) {
    const { actualizedCalendarQuery } = this.props.connection;
    if (this.props.connection.status !== "connected") {
      this.clearExpirationTimeout();
      if (!_isEqual(this.serverCalendarQuery)(actualizedCalendarQuery)) {
        this.serverCalendarQuery = actualizedCalendarQuery;
      }
      return;
    }

    if (
      !_isEqual(this.serverCalendarQuery)(actualizedCalendarQuery) &&
      _isEqual(this.props.currentCalendarQuery())(actualizedCalendarQuery)
    ) {
      this.serverCalendarQuery = actualizedCalendarQuery;
    }

    let expired = false;
    if (
      prevProps.connection.status !== "connected" ||
      this.props.lastUserInteractionCalendar !==
        prevProps.lastUserInteractionCalendar
    ) {
      expired = this.setExpirationTimeout();
    }

    const shouldUpdate = (
      expired ||
      prevProps.connection.status !== "connected" ||
      this.props.currentCalendarQuery !== prevProps.currentCalendarQuery
    ) && this.shouldUpdateCalendarQuery;

    if (shouldUpdate) {
      this.updateCalendarQuery();
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

  setExpirationTimeout() {
    this.clearExpirationTimeout();
    const timeUntilExpiration =
      timeUntilCalendarRangeExpiration(this.props.lastUserInteractionCalendar);
    if (timeUntilExpiration === null || timeUntilExpiration === undefined) {
      return false;
    }
    if (timeUntilExpiration <= 0) {
      return true;
    } else {
      this.expirationTimeoutID = setTimeout(
        this.possiblyUpdateCalendarQuery,
        timeUntilExpiration,
      );
    }
    return false;
  }

  get shouldUpdateCalendarQuery() {
    if (this.props.connection.status !== "connected") {
      return false;
    }
    const calendarQuery = this.props.currentCalendarQuery();
    return !_isEqual(calendarQuery)(this.serverCalendarQuery);
  }

  updateCalendarQuery() {
    const calendarQuery = this.props.currentCalendarQuery();
    this.serverCalendarQuery = calendarQuery;
    this.props.dispatchActionPromise(
      updateCalendarQueryActionTypes,
      this.props.updateCalendarQuery(calendarQuery, true),
      undefined,
      ({ calendarQuery }: CalendarQueryUpdateStartingPayload),
    );
  }

  possiblyUpdateCalendarQuery = () => {
    if (this.shouldUpdateCalendarQuery) {
      this.updateCalendarQuery();
    }
  }

}


export default connect(
  (state: BaseAppState<*>) => ({
    connection: state.connection,
    lastUserInteractionCalendar: state.entryStore.lastUserInteractionCalendar
  }),
  { updateCalendarQuery },
)(CalendarQueryHandler);
