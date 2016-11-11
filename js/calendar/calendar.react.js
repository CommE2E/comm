// @flow

import type { EntryInfo } from './entry-info';
import { entryInfoPropType } from './entry-info';
import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import _ from 'lodash';
import $ from 'jquery';

import Day from './day.react';
import { getDate} from '../date-utils';

type Props = {
  thisURL: string,
  baseURL: string,
  currentNavID: string,
  sessionID: string,
  year: number,
  month: number, // 1-indexed
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  squadInfos: {[id: string]: SquadInfo},
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};

class Calendar extends React.Component {

  props: Props;

  componentDidMount() {
    this.recomputeTabIndices();
  }

  recomputeTabIndices() {
    $('textarea.entry-text').each(
      (i, elem) => $(elem).attr('tabindex', i + 1),
    );
  }

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
    for (
      let curDayOfMonth = firstDayToPrint;
      curDayOfMonth <= lastDayToPrint;
      curDayOfMonth++
    ) {
      if (curDayOfMonth < 1 || curDayOfMonth > totalDaysInMonth) {
        columns.push(<td key={curDayOfMonth} />);
      } else {
        const entries = _.sortBy(
          this.props.entryInfos[curDayOfMonth.toString()],
          "creationTime",
        );
        columns.push(
          <Day
            thisURL={this.props.thisURL}
            baseURL={this.props.baseURL}
            currentNavID={this.props.currentNavID}
            sessionID={this.props.sessionID}
            year={this.props.year}
            month={this.props.month}
            day={curDayOfMonth} 
            entryInfos={entries}
            squadInfos={this.props.squadInfos}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            recomputeTabIndices={this.recomputeTabIndices.bind(this)}
            key={curDayOfMonth}
          />
        );
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
  thisURL: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  entryInfos: React.PropTypes.objectOf(
    React.PropTypes.objectOf(entryInfoPropType),
  ).isRequired,
  squadInfos: React.PropTypes.objectOf(squadInfoPropType).isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default Calendar;
