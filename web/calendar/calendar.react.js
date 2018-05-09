// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import { type AppState, type NavInfo, navInfoPropType } from '../redux-setup';

import * as React from 'react';
import _filter from 'lodash/fp/filter';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { Link } from 'react-router-dom';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faFilter from '@fortawesome/fontawesome-free-solid/faFilter';

import {
  getDate,
  dateString,
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { currentDaysToEntries } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import Day from './day.react';
import {
  yearAssertingSelector,
  monthAssertingSelector,
} from '../selectors/nav-selectors';
import css from '../style.css';
import { canonicalURLFromReduxState } from '../url-utils';
import FilterPanel from './filter-panel.react';

type Props = {
  setModal: (modal: React.Node) => void,
  clearModal: () => void,
  url: string,
  // Redux state
  year: number,
  month: number, // 1-indexed
  daysToEntries: {[dayString: string]: EntryInfo[]},
  navInfo: NavInfo,
};
type State = {|
  filterPanelOpen: bool,
|};
class Calendar extends React.PureComponent<Props, State> {

  static propTypes = {
    setModal: PropTypes.func.isRequired,
    clearModal: PropTypes.func.isRequired,
    url: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
    month: PropTypes.number.isRequired,
    daysToEntries: PropTypes.objectOf(
      PropTypes.arrayOf(entryInfoPropType),
    ).isRequired,
    navInfo: navInfoPropType.isRequired,
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

  render() {
    const year = this.props.year;
    const month = this.props.month;
    const monthName = dateFormat(getDate(year, month, 1), "mmmm");

    const lastMonthDate = getDate(year, month - 1, 1);
    const prevYear = lastMonthDate.getFullYear();
    const prevMonth = lastMonthDate.getMonth() + 1;
    const prevURL = canonicalURLFromReduxState(
      {
        ...this.props.navInfo,
        startDate: startDateForYearAndMonth(prevYear, prevMonth),
        endDate: endDateForYearAndMonth(prevYear, prevMonth),
      },
      this.props.url,
    );

    const nextMonthDate = getDate(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;
    const nextURL = canonicalURLFromReduxState(
      {
        ...this.props.navInfo,
        startDate: startDateForYearAndMonth(nextYear, nextMonth),
        endDate: endDateForYearAndMonth(nextYear, nextMonth),
      },
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
        const dayString =
          dateString(this.props.year, this.props.month, curDayOfMonth);
        const entries = this.props.daysToEntries[dayString];
        invariant(
          entries,
          "the currentDaysToEntries selector should make sure all dayStrings " +
            `in the current range have entries, but ${dayString} did not`,
        );
        columns.push(
          <Day
            dayString={dayString}
            entryInfos={entries}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            key={curDayOfMonth}
            startingTabIndex={tabIndex}
          />
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
      filterPanel = (
        <FilterPanel
          setModal={this.props.setModal}
          clearModal={this.props.clearModal}
        />
      );
      calendarContentStyle = { marginLeft: "300px" };
      filterButtonStyle = { backgroundColor: "#000000AA" };
    }

    return (
      <div className={css['calendar-container']}>
        {filterPanel}
        <div className={css['calendar-content']} style={calendarContentStyle}>
          <div className={css['calendar-header']}>
            <a
              className={css['calendar-filters-button']}
              onClick={this.toggleFilters}
              style={filterButtonStyle}
            >
              <FontAwesomeIcon icon={faFilter} />
              Filters
            </a>
            <h2 className={css['calendar-nav']}>
              <Link to={prevURL} className={css['previous-month-link']}>
                &lt;
              </Link>
              <div className={css['calendar-month-name']}>
                {" "}
                {monthName}
                {" "}
                {year}
                {" "}
              </div>
              <Link to={nextURL} className={css['next-month-link']}>
                &gt;
              </Link>
            </h2>
          </div>
          <table className={css['calendar']}>
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
  }

}

export default connect((state: AppState) => ({
  year: yearAssertingSelector(state),
  month: monthAssertingSelector(state),
  daysToEntries: currentDaysToEntries(state),
  navInfo: state.navInfo,
}))(Calendar);
