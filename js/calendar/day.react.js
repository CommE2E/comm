// @flow

import type { EntryInfo } from './entry-info';
import { entryInfoPropType } from './entry-info';
import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import update from 'immutability-helper';
import invariant from 'invariant';
import { connect } from 'react-redux';

import Entry from './entry.react';
import Modernizr from '../modernizr-custom';
import { entryKey } from './entry-utils';
import HistoryModal from '../modals/history/history-modal.react';
import { mapStateToUpdateStore } from '../redux-utils';
import { onScreenCalendarInfos } from '../calendar-utils';
import CalendarPicker from './calendar-picker.react';
import { htmlTargetFromEvent } from '../vector-utils';
import { AddVector, HistoryVector } from '../vectors.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';

type Props = {
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  entryInfos: EntryInfo[],
  onScreenCalendarInfos: CalendarInfo[],
  username: string,
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  startingTabIndex: number,
  updateStore: UpdateStore,
};
type State = {
  pickerOpen: bool,
  hovered: bool,
};
type EntryConnect = {
  getWrappedInstance: () => Entry,
};

class Day extends React.Component {

  props: Props;
  state: State;
  entryContainer: ?HTMLDivElement;
  entryContainerSpacer: ?HTMLDivElement;
  actionLinks: ?HTMLDivElement;
  entries: Map<string, EntryConnect>;
  curLocalID: number;

  constructor(props: Props) {
    super(props);
    this.state = {
      pickerOpen: false,
      hovered: false,
    };
    this.curLocalID = 0;
    this.entries = new Map();
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.onScreenCalendarInfos.length === 0) {
      this.setState({ pickerOpen: false });
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.entryInfos.length > prevProps.entryInfos.length) {
      invariant(this.entryContainer, "entryContainer ref not set");
      this.entryContainer.scrollTop = this.entryContainer.scrollHeight;
    }
  }

  render() {
    const today = new Date();
    const isToday = today.getDate() === this.props.day &&
      today.getMonth() === this.props.month - 1 &&
      today.getFullYear() === this.props.year;
    const tdClasses = classNames("day", { "current-day": isToday });

    let actionLinks = null;
    if (this.state.hovered || Modernizr.touchevents) {
      actionLinks = (
        <div
          className="action-links day-action-links"
          ref={(elem) => this.actionLinks = elem}
        >
          <a
            href="#"
            className="add-entry-button"
            onClick={this.onAddEntry.bind(this)}
          >
            <AddVector className="add" />
            <span className="action-links-text">Add</span>
          </a>
          <a
            href="#"
            className="day-history-button"
            onClick={this.onHistory.bind(this)}
          >
            <HistoryVector className="history" />
            <span className="action-links-text">History</span>
          </a>
        </div>
      );
    }

    const entries = this.props.entryInfos.filter((entryInfo) =>
      _.some(this.props.onScreenCalendarInfos, ['id', entryInfo.calendarID])
    ).map((entryInfo, i) => {
      const key = entryKey(entryInfo);
      return <Entry
        entryInfo={entryInfo}
        focusOnFirstEntryNewerThan={this.focusOnFirstEntryNewerThan.bind(this)}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        tabIndex={this.props.startingTabIndex + i}
        key={key}
        ref={(entry) => this.entries.set(key, entry)}
      />;
    });

    let calendarPicker = null;
    if (this.state.pickerOpen) {
      invariant(
        this.props.onScreenCalendarInfos.length > 0,
        "onScreenCalendarInfos should exist if pickerOpen",
      );
      calendarPicker = (
        <CalendarPicker
          createNewEntry={this.createNewEntry.bind(this)}
          closePicker={() => this.setState({ pickerOpen: false })}
        />
      );
    }

    const entryContainerClasses = classNames(
      "entry-container",
      { "focused-entry-container": this.state.hovered },
    );
    return (
      <td
        className={tdClasses}
        onClick={this.onClick.bind(this)}
        onMouseEnter={() => this.setState({ hovered: true })}
        onMouseLeave={() => this.setState({ hovered: false })}
      >
        <h2>{this.props.day}</h2>
        <div
          className={entryContainerClasses}
          ref={(elem) => this.entryContainer = elem}
        >
          {entries}
          <div
            className="entry-container-spacer"
            ref={(elem) => this.entryContainerSpacer = elem}
          />
        </div>
        {actionLinks}
        {calendarPicker}
      </td>
    );
  }

  onClick(event: SyntheticEvent) {
    const target = htmlTargetFromEvent(event);
    invariant(
      this.entryContainer instanceof HTMLDivElement,
      "entryContainer isn't div",
    );
    invariant(
      this.entryContainerSpacer instanceof HTMLDivElement,
      "entryContainerSpacer isn't div",
    );
    if (
      target === this.entryContainer ||
      target === this.entryContainerSpacer ||
      (this.actionLinks && target === this.actionLinks)
    ) {
      this.onAddEntry(event);
    }
  }

  onAddEntry(event: SyntheticEvent) {
    event.preventDefault();
    invariant(
      this.props.onScreenCalendarInfos.length > 0,
      "onAddEntry shouldn't be clicked if no onScreenCalendarInfos",
    );
    if (this.props.onScreenCalendarInfos.length === 1) {
      this.createNewEntry(this.props.onScreenCalendarInfos[0].id);
    } else if (this.props.onScreenCalendarInfos.length > 1) {
      this.setState({ pickerOpen: true });
    }
  }

  createNewEntry(calendarID: string) {
    const calendarInfo = this.props.onScreenCalendarInfos.find(
      (calendarInfo) => calendarInfo.id === calendarID,
    );
    invariant(calendarInfo, "matching CalendarInfo not found");
    if (calendarInfo.editRules >= 1 && !this.props.loggedIn) {
      this.props.setModal(
        <LogInFirstModal
          inOrderTo="edit this calendar"
          onClose={this.props.clearModal}
          setModal={this.props.setModal}
        />
      );
      return;
    }
    const localID = `local${this.curLocalID++}`;
    this.props.updateStore((prevState: AppState) => {
      const dayString = this.props.day.toString();
      const dayEntryInfos = prevState.entryInfos[dayString];
      const newEntryInfo: EntryInfo = {
        localID: localID,
        calendarID: calendarID,
        text: "",
        year: this.props.year,
        month: this.props.month,
        day: this.props.day,
        creationTime: Date.now(),
        creator: this.props.username,
        deleted: false,
      };
      const saveObj = {};
      saveObj[dayString] = {};
      saveObj[dayString][localID] = { $set: newEntryInfo };
      return update(prevState, { entryInfos: saveObj });
    });
  }

  onHistory(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <HistoryModal
        mode="day"
        year={this.props.year}
        month={this.props.month}
        day={this.props.day}
        onClose={this.props.clearModal}
      />
    );
  }

  focusOnFirstEntryNewerThan(time: number) {
    const entryInfo = this.props.entryInfos.find(
      (entryInfo) => entryInfo.creationTime > time,
    );
    if (entryInfo) {
      const entry = this.entries.get(entryKey(entryInfo));
      invariant(entry, "entry for entryinfo should be defined");
      entry.getWrappedInstance().focus();
    }
  }

}

Day.propTypes = {
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  entryInfos: React.PropTypes.arrayOf(entryInfoPropType).isRequired,
  onScreenCalendarInfos:
    React.PropTypes.arrayOf(calendarInfoPropType).isRequired,
  username: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  startingTabIndex: React.PropTypes.number.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    onScreenCalendarInfos: onScreenCalendarInfos(state),
    username: state.username,
    loggedIn: state.loggedIn,
  }),
  mapStateToUpdateStore,
)(Day);
