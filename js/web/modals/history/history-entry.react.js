// @flow

import type { CalendarInfo } from 'lib/model/calendar-info';
import { calendarInfoPropType } from 'lib/model/calendar-info';
import type { EntryInfo } from 'lib/model/entry-info';
import { entryInfoPropType } from 'lib/model/entry-info';
import type { AppState, LoadingStatus } from 'lib/model/redux-reducer';

import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import { colorIsDark } from 'lib/shared/calendar-utils';
import fetchJSON from 'lib/utils/fetch-json';

import css from '../../style.css';
import LoadingIndicator from '../../loading-indicator.react';

type Props = {
  entryInfo: EntryInfo,
  calendarInfo: CalendarInfo,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  sessionID: string,
  loggedIn: bool,
  onClick: (event: SyntheticEvent) => Promise<void>,
  restoreEntryInfo: (entryInfo: EntryInfo) => Promise<void>,
};
type State = {
  restoreLoadingStatus: LoadingStatus,
  deleted: bool,
}

class HistoryEntry extends React.Component {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      restoreLoadingStatus: "inactive",
      deleted: props.entryInfo.deleted,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.state.deleted !== nextProps.entryInfo.deleted) {
      this.setState({ deleted: nextProps.entryInfo.deleted });
    }
  }

  render() {
    let deleted = null;
    if (this.state.deleted) {
      let restore = null;
      if (this.props.calendarInfo.editRules < 1 || this.props.loggedIn) {
        restore = (
          <span>
            <span className={css['restore-entry-label']}>
              (<a
                href="#"
                onClick={this.onRestore.bind(this)}
              >restore</a>)
            </span>
            <LoadingIndicator
              status={this.state.restoreLoadingStatus}
              className={css['restore-loading']}
            />
          </span>
        );
      }
      deleted = (
        <span className={css['deleted-entry']}>
          <span className={css['deleted-entry-label']}>deleted</span>
          {restore}
        </span>
      );
    }

    const textClasses = classNames({
      [css['entry']]: true,
      [css['entry-history-entry']]: true,
      [css['dark-entry']]: colorIsDark(this.props.calendarInfo.color),
    });
    const textStyle = { backgroundColor: "#" + this.props.calendarInfo.color };
    const creator = this.props.entryInfo.creator === null
      ? "Anonymous"
      : <span className={css['entry-username']}>
          {this.props.entryInfo.creator}
        </span>;

    return (
      <li>
        <div className={textClasses} style={textStyle}>
          {this.props.entryInfo.text}
        </div>
        <span className={css['entry-author']}>
          {"created by "}
          {creator}
        </span>
        <span className={css['entry-calendar']}>
          {this.props.calendarInfo.name}
        </span>
        <div className={css['clear']} />
        {deleted}
        <a
          href="#"
          className={css['revision-history-button']}
          onClick={this.props.onClick}
        >revision history &gt;</a>
        <div className={css['clear']} />
      </li>
    );
  }

  async onRestore(event: SyntheticEvent) {
    event.preventDefault();
    this.setState({ restoreLoadingStatus: "loading" });
    const response = await fetchJSON('restore_entry.php', {
      'id': this.props.entryInfo.id,
      'session_id': this.props.sessionID,
      'timestamp': Date.now(),
    });
    if (!response.success) {
      this.setState({ restoreLoadingStatus: "error" });
      return;
    }
    this.setState({
      restoreLoadingStatus: "inactive",
      deleted: false,
    });
    await this.props.restoreEntryInfo({
      id: this.props.entryInfo.id,
      calendarID: this.props.entryInfo.calendarID,
      text: response.text,
      year: this.props.year,
      month: this.props.month,
      day: this.props.day,
      creationTime: response.creation_time,
      creator: this.props.entryInfo.creator,
      deleted: false,
    });
  }

}

HistoryEntry.propTypes = {
  entryInfo: entryInfoPropType,
  calendarInfo: calendarInfoPropType,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  onClick: React.PropTypes.func.isRequired,
  restoreEntryInfo: React.PropTypes.func.isRequired,
}

type OwnProps = { entryInfo: EntryInfo };
export default connect((state: AppState, ownProps: OwnProps) => ({
  calendarInfo: state.calendarInfos[ownProps.entryInfo.calendarID],
  sessionID: state.sessionID,
  loggedIn: state.loggedIn,
}))(HistoryEntry);
