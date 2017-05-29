// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup'
import type { InnerEntry } from './entry.react';

import React from 'react';
import classNames from 'classnames';
import _some from 'lodash/fp/some';
import invariant from 'invariant';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { entryKey } from 'lib/shared/entry-utils';
import { onScreenCalendarInfos } from 'lib/selectors/calendar-selectors';
import { includeDispatchActionProps } from 'lib/utils/action-utils';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { dateString, dateFromString } from 'lib/utils/date-utils'

import css from '../style.css';
import Entry from './entry.react';
import Modernizr from '../modernizr-custom';
import HistoryModal from '../modals/history/history-modal.react';
import CalendarPicker from './calendar-picker.react';
import { htmlTargetFromEvent } from '../vector-utils';
import { AddVector, HistoryVector } from '../vectors.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';

type Props = {
  dayString: string,
  entryInfos: EntryInfo[],
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  startingTabIndex: number,
  // Redux state
  onScreenCalendarInfos: CalendarInfo[],
  username: ?string,
  loggedIn: bool,
  // Redux dispatch functions
  dispatchActionPayload: (actionType: string, payload: *) => void,
};
type State = {
  pickerOpen: bool,
  hovered: bool,
};

class Day extends React.PureComponent {

  props: Props;
  state: State;
  entryContainer: ?HTMLDivElement;
  entryContainerSpacer: ?HTMLDivElement;
  actionLinks: ?HTMLDivElement;
  entries: Map<string, InnerEntry>;

  constructor(props: Props) {
    super(props);
    this.state = {
      pickerOpen: false,
      hovered: false,
    };
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
    const isToday = dateString(new Date()) === this.props.dayString;
    const tdClasses = classNames(css['day'], { [css['current-day']]: isToday });

    let actionLinks = null;
    const hovered = this.state.hovered || Modernizr.touchevents;
    if (hovered) {
      actionLinks = (
        <div
          className={`${css['action-links']} ${css['day-action-links']}`}
          ref={this.actionLinksRef}
        >
          <a
            href="#"
            className={css['add-entry-button']}
            onClick={this.onAddEntry}
          >
            <AddVector className={css['add']} />
            <span className={css['action-links-text']}>Add</span>
          </a>
          <a
            href="#"
            className={css['day-history-button']}
            onClick={this.onHistory}
          >
            <HistoryVector className={css['history']} />
            <span className={css['action-links-text']}>History</span>
          </a>
        </div>
      );
    }

    const entries = this.props.entryInfos.filter((entryInfo) =>
      _some(['id', entryInfo.threadID])(this.props.onScreenCalendarInfos),
    ).map((entryInfo, i) => {
      const key = entryKey(entryInfo);
      return <Entry
        entryInfo={entryInfo}
        focusOnFirstEntryNewerThan={this.focusOnFirstEntryNewerThan}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        tabIndex={this.props.startingTabIndex + i}
        key={key}
        innerRef={this.entryRef}
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
          createNewEntry={this.createNewEntry}
          closePicker={this.closePicker}
        />
      );
    }

    const entryContainerClasses = classNames(
      css['entry-container'],
      { [css['focused-entry-container']]: hovered },
    );
    const date = dateFromString(this.props.dayString);
    return (
      <td
        className={tdClasses}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <h2>{date.getDate()}</h2>
        <div className={entryContainerClasses} ref={this.entryContainerRef}>
          {entries}
          <div
            className={css['entry-container-spacer']}
            ref={this.entryContainerSpacerRef}
          />
        </div>
        {actionLinks}
        {calendarPicker}
      </td>
    );
  }

  actionLinksRef = (actionLinks: ?HTMLDivElement) => {
    this.actionLinks = actionLinks;
  }

  entryContainerRef = (entryContainer: ?HTMLDivElement) => {
    this.entryContainer = entryContainer;
  }

  entryContainerSpacerRef = (entryContainerSpacer: ?HTMLDivElement) => {
    this.entryContainerSpacer = entryContainerSpacer;
  }

  entryRef = (key: string, entry: InnerEntry) => {
    this.entries.set(key, entry);
  }

  closePicker = () => {
    this.setState({ pickerOpen: false });
  }

  onMouseEnter = () => {
    this.setState({ hovered: true });
  }

  onMouseLeave = () => {
    this.setState({ hovered: false });
  }

  onClick = (event: SyntheticEvent) => {
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

  onAddEntry = (event: SyntheticEvent) => {
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

  createNewEntry = (threadID: string) => {
    const calendarInfo = this.props.onScreenCalendarInfos.find(
      (calendarInfo) => calendarInfo.id === threadID,
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
    this.props.dispatchActionPayload(
      createLocalEntryActionType,
      createLocalEntry(
        threadID,
        this.props.dayString,
        this.props.username,
      ),
    );
  }

  onHistory = (event: SyntheticEvent) => {
    event.preventDefault();
    this.props.setModal(
      <HistoryModal
        mode="day"
        dayString={this.props.dayString}
        onClose={this.props.clearModal}
      />
    );
  }

  focusOnFirstEntryNewerThan = (time: number) => {
    const entryInfo = this.props.entryInfos.find(
      (entryInfo) => entryInfo.creationTime > time,
    );
    if (entryInfo) {
      const entry = this.entries.get(entryKey(entryInfo));
      invariant(entry, "entry for entryinfo should be defined");
      entry.focus();
    }
  }

}

Day.propTypes = {
  dayString: PropTypes.string.isRequired,
  entryInfos: PropTypes.arrayOf(entryInfoPropType).isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  startingTabIndex: PropTypes.number.isRequired,
  onScreenCalendarInfos: PropTypes.arrayOf(calendarInfoPropType).isRequired,
  username: PropTypes.string,
  loggedIn: PropTypes.bool.isRequired,
  dispatchActionPayload: PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    onScreenCalendarInfos: onScreenCalendarInfos(state),
    username: state.userInfo && state.userInfo.username,
    loggedIn: !!state.userInfo,
  }),
  includeDispatchActionProps({ dispatchActionPayload: true }),
)(Day);
