// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup';

import React from 'react';
import _filter from 'lodash/fp/filter';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { getDate, dateString } from 'lib/utils/date-utils';
import { currentDaysToEntries } from 'lib/selectors/calendar-selectors';

import Day from './day.react';
import {
  yearAssertingSelector,
  monthAssertingSelector,
} from '../selectors/nav-selectors';

type Props = {
  year: number,
  month: number, // 1-indexed
  daysToEntries: {[dayString: string]: EntryInfo[]},
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};

class Calendar extends React.PureComponent {

  props: Props;

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

    return (
      <table>
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
    );
  }

}

Calendar.propTypes = {
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  daysToEntries: PropTypes.objectOf(
    PropTypes.arrayOf(entryInfoPropType),
  ).isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
};

export default connect((state: AppState) => ({
  year: yearAssertingSelector(state),
  month: monthAssertingSelector(state),
  daysToEntries: currentDaysToEntries(state),
}))(Calendar);
