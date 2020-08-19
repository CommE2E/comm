// @flow

import {
  entryInfoPropType,
  type EntryInfo,
  type CalendarQuery,
  type CalendarQueryUpdateResult,
  type CalendarQueryUpdateStartingPayload,
} from 'lib/types/entry-types';
import {
  type AppState,
  type NavInfo,
  navInfoPropType,
} from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';

import {
  getDate,
  dateString,
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { currentDaysToEntries } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';
import {
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
} from 'lib/actions/entry-actions';

import Day from './day.react';
import {
  yearAssertingSelector,
  monthAssertingSelector,
  webCalendarQuery,
} from '../selectors/nav-selectors';
import css from './calendar.css';
import { canonicalURLFromReduxState } from '../url-utils';
import FilterPanel from './filter-panel.react';

type Props = {
  setModal: (modal: ?React.Node) => void,
  url: string,
  // Redux state
  year: number,
  month: number, // 1-indexed
  daysToEntries: { [dayString: string]: EntryInfo[] },
  navInfo: NavInfo,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  updateCalendarQuery: (
    calendarQuery: CalendarQuery,
    reduxAlreadyUpdated?: boolean,
  ) => Promise<CalendarQueryUpdateResult>,
};
type State = {|
  filterPanelOpen: boolean,
|};
class Calendar extends React.PureComponent<Props, State> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
    url: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
    month: PropTypes.number.isRequired,
    daysToEntries: PropTypes.objectOf(PropTypes.arrayOf(entryInfoPropType))
      .isRequired,
    navInfo: navInfoPropType.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateCalendarQuery: PropTypes.func.isRequired,
  };
  state = {
    filterPanelOpen: false,
  };

  getDate(
    dayOfMonth: number,
    monthInput: ?number = undefined,
    yearInput: ?number = undefined,
  ) {
    return getDate(
      yearInput ? yearInput : this.props.year,
      monthInput ? monthInput : this.props.month,
      dayOfMonth,
    );
  }

  prevMonthDates() {
    const { year, month } = this.props;
    const lastMonthDate = getDate(year, month - 1, 1);
    const prevYear = lastMonthDate.getFullYear();
    const prevMonth = lastMonthDate.getMonth() + 1;
    return {
      startDate: startDateForYearAndMonth(prevYear, prevMonth),
      endDate: endDateForYearAndMonth(prevYear, prevMonth),
    };
  }

  nextMonthDates() {
    const { year, month } = this.props;
    const nextMonthDate = getDate(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;
    return {
      startDate: startDateForYearAndMonth(nextYear, nextMonth),
      endDate: endDateForYearAndMonth(nextYear, nextMonth),
    };
  }

  render() {
    const { year, month } = this.props;
    const monthName = dateFormat(getDate(year, month, 1), 'mmmm');
    const prevURL = canonicalURLFromReduxState(
      { ...this.props.navInfo, ...this.prevMonthDates() },
      this.props.url,
    );
    const nextURL = canonicalURLFromReduxState(
      { ...this.props.navInfo, ...this.nextMonthDates() },
      this.props.url,
    );

    const lastDayOfMonth = this.getDate(0, this.props.month + 1);
    const totalDaysInMonth = lastDayOfMonth.getDate();
    const firstDayToPrint = 1 - this.getDate(1).getDay();
    const lastDayToPrint = totalDaysInMonth + 6 - lastDayOfMonth.getDay();

    const rows = [];
    let columns = [];
    let week = 1;
    let tabIndex = 1;
    for (
      let curDayOfMonth = firstDayToPrint;
      curDayOfMonth <= lastDayToPrint;
      curDayOfMonth++
    ) {
      if (curDayOfMonth < 1 || curDayOfMonth > totalDaysInMonth) {
        columns.push(<td key={curDayOfMonth} />);
      } else {
        const dayString = dateString(
          this.props.year,
          this.props.month,
          curDayOfMonth,
        );
        const entries = this.props.daysToEntries[dayString];
        invariant(
          entries,
          'the currentDaysToEntries selector should make sure all dayStrings ' +
            `in the current range have entries, but ${dayString} did not`,
        );
        columns.push(
          <Day
            dayString={dayString}
            entryInfos={entries}
            setModal={this.props.setModal}
            key={curDayOfMonth}
            startingTabIndex={tabIndex}
          />,
        );
        tabIndex += entries.length;
      }
      if (columns.length === 7) {
        rows.push(<tr key={week++}>{columns}</tr>);
        columns = [];
      }
    }

    let filterPanel = null;
    let calendarContentStyle = null;
    let filterButtonStyle = null;
    if (this.state.filterPanelOpen) {
      filterPanel = <FilterPanel setModal={this.props.setModal} />;
      calendarContentStyle = { marginLeft: '300px' };
      filterButtonStyle = { backgroundColor: 'rgba(0,0,0,0.67)' };
    }

    return (
      <div>
        {filterPanel}
        <div className={css.content} style={calendarContentStyle}>
          <div>
            <a
              className={css.filtersButton}
              onClick={this.toggleFilters}
              style={filterButtonStyle}
            >
              <FontAwesomeIcon icon={faFilter} />
              Filters
            </a>
            <h2 className={css.nav}>
              <a
                className={css.monthLink}
                href={prevURL}
                onClick={this.onClickPrevURL}
              >
                &lt;
              </a>
              <div className={css.monthName}>
                {' '}
                {monthName} {year}{' '}
              </div>
              <a
                className={css.monthLink}
                href={nextURL}
                onClick={this.onClickNextURL}
              >
                &gt;
              </a>
            </h2>
          </div>
          <table className={css.calendar}>
            <thead>
              <tr>
                <th>Sunday</th>
                <th>Monday</th>
                <th>Tuesday</th>
                <th>Wednesday</th>
                <th>Thursday</th>
                <th>Friday</th>
                <th>Saturday</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </div>
    );
  }

  toggleFilters = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState({ filterPanelOpen: !this.state.filterPanelOpen });
  };

  onClickPrevURL = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const currentCalendarQuery = this.props.currentCalendarQuery();
    const newCalendarQuery = {
      ...currentCalendarQuery,
      ...this.prevMonthDates(),
    };
    this.props.dispatchActionPromise(
      updateCalendarQueryActionTypes,
      this.props.updateCalendarQuery(newCalendarQuery, true),
      undefined,
      ({ calendarQuery: newCalendarQuery }: CalendarQueryUpdateStartingPayload),
    );
  };

  onClickNextURL = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const currentCalendarQuery = this.props.currentCalendarQuery();
    const newCalendarQuery = {
      ...currentCalendarQuery,
      ...this.nextMonthDates(),
    };
    this.props.dispatchActionPromise(
      updateCalendarQueryActionTypes,
      this.props.updateCalendarQuery(newCalendarQuery, true),
      undefined,
      ({ calendarQuery: newCalendarQuery }: CalendarQueryUpdateStartingPayload),
    );
  };
}

export default connect(
  (state: AppState) => ({
    year: yearAssertingSelector(state),
    month: monthAssertingSelector(state),
    daysToEntries: currentDaysToEntries(state),
    navInfo: state.navInfo,
    currentCalendarQuery: webCalendarQuery(state),
  }),
  { updateCalendarQuery },
)(Calendar);
