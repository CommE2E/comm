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
  foreground: bool,
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
    foreground: PropTypes.bool.isRequired,
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
    if (this.props.connection.status === "connected") {
      this.possiblyUpdateCalendarQuery();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { actualizedCalendarQuery } = this.props.connection;
    if (this.props.connection.status !== "connected") {
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

    const shouldUpdate = (
      this.isExpired ||
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

  get isExpired() {
    const timeUntilExpiration =
      timeUntilCalendarRangeExpiration(this.props.lastUserInteractionCalendar);
    return timeUntilExpiration !== null &&
      timeUntilExpiration !== undefined &&
      timeUntilExpiration <= 0;
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
    lastUserInteractionCalendar: state.entryStore.lastUserInteractionCalendar,
    // We include this so that componentDidUpdate will be called on foreground
    foreground: state.foreground,
  }),
  { updateCalendarQuery },
)(CalendarQueryHandler);
