// @flow

import dateFormat from 'dateformat';
import invariant from 'invariant';
import * as React from 'react';

import {
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
} from 'lib/actions/entry-actions.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { currentDaysToEntries } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  type EntryInfo,
  type CalendarQuery,
  type CalendarQueryUpdateResult,
  type CalendarQueryUpdateStartingPayload,
} from 'lib/types/entry-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import {
  getDate,
  dateString,
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils.js';

import css from './calendar.css';
import Day from './day.react.js';
import FilterPanel from './filter-panel.react.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  yearAssertingSelector,
  monthAssertingSelector,
  webCalendarQuery,
} from '../selectors/nav-selectors.js';
import type { NavInfo } from '../types/nav-types.js';
import { canonicalURLFromReduxState } from '../url-utils.js';

type BaseProps = {
  +url: string,
};
type Props = {
  ...BaseProps,
  +year: number,
  +month: number,
  +daysToEntries: { +[dayString: string]: EntryInfo[] },
  +navInfo: NavInfo,
  +currentCalendarQuery: () => CalendarQuery,
  +loggedIn: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +updateCalendarQuery: (
    calendarQuery: CalendarQuery,
    reduxAlreadyUpdated?: boolean,
  ) => Promise<CalendarQueryUpdateResult>,
};
type State = {
  +filterPanelOpen: boolean,
};
class Calendar extends React.PureComponent<Props, State> {
  state: State = {
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
      this.props.loggedIn,
    );
    const nextURL = canonicalURLFromReduxState(
      { ...this.props.navInfo, ...this.nextMonthDates() },
      this.props.url,
      this.props.loggedIn,
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
      filterPanel = <FilterPanel toggleFilters={this.toggleFilters} />;
      calendarContentStyle = { marginLeft: '300px' };
      filterButtonStyle = { display: 'none' };
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
              <SWMansionIcon icon="filters-2" size={16} />
            </a>
            <nav className={css.nav}>
              <a
                className={css.monthLink}
                href={prevURL}
                onClick={this.onClickPrevURL}
              >
                <SWMansionIcon icon="chevron-left" size={24} />
              </a>
              <h2 className={css.monthName}>
                {' '}
                {monthName} {year}{' '}
              </h2>
              <a
                className={css.monthLink}
                href={nextURL}
                onClick={this.onClickNextURL}
              >
                <SWMansionIcon icon="chevron-right" size={24} />
              </a>
            </nav>
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

const ConnectedCalendar: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedCalendar(props) {
    const year = useSelector(yearAssertingSelector);
    const month = useSelector(monthAssertingSelector);
    const daysToEntries = useSelector(currentDaysToEntries);
    const navInfo = useSelector(state => state.navInfo);
    const currentCalendarQuery = useSelector(webCalendarQuery);
    const loggedIn = useSelector(isLoggedIn);
    const callUpdateCalendarQuery = useServerCall(updateCalendarQuery);
    const dispatchActionPromise = useDispatchActionPromise();

    return (
      <Calendar
        {...props}
        year={year}
        month={month}
        daysToEntries={daysToEntries}
        navInfo={navInfo}
        currentCalendarQuery={currentCalendarQuery}
        loggedIn={loggedIn}
        dispatchActionPromise={dispatchActionPromise}
        updateCalendarQuery={callUpdateCalendarQuery}
      />
    );
  },
);

export default ConnectedCalendar;
