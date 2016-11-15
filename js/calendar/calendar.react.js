// @flow

import type { EntryInfo } from './entry-info';
import { entryInfoPropType } from './entry-info';
import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';
import type { AppState } from '../redux-reducer';

import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Day from './day.react';
import { getDate } from '../date-utils';
import { onScreenSquadInfos } from '../squad-utils';

type Props = {
  year: number,
  month: number, // 1-indexed
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  onScreenSquadInfos: SquadInfo[],
};

class Calendar extends React.Component {

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
        const entries = _.chain(this.props.entryInfos[curDayOfMonth.toString()])
          .filter(
            (entryInfo) => entryInfo.year === this.props.year &&
              entryInfo.month === this.props.month &&
              _.some(this.props.onScreenSquadInfos, ['id', entryInfo.squadID])
          ).sortBy("creationTime")
          .value();
        columns.push(
          <Day
            year={this.props.year}
            month={this.props.month}
            day={curDayOfMonth} 
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
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  entryInfos: React.PropTypes.objectOf(
    React.PropTypes.objectOf(entryInfoPropType),
  ).isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  onScreenSquadInfos: React.PropTypes.arrayOf(squadInfoPropType).isRequired,
};

export default connect((state: AppState) => ({
  year: state.navInfo.year,
  month: state.navInfo.month,
  entryInfos: state.entryInfos,
  onScreenSquadInfos: onScreenSquadInfos(state),
}))(Calendar);
