// @flow

import type { HistoryEntryInfo } from './history-types';
import { historyEntryInfoPropType } from './history-types';
import type { SquadInfo } from '../../squad-info';
import { squadInfoPropType } from '../../squad-info';
import type { EntryInfo } from '../../calendar/entry-info';
import { entryInfoPropType } from '../../calendar/entry-info';
import type { LoadingStatus } from '../../loading-indicator.react';
import type { AppState } from '../../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import LoadingIndicator from '../../loading-indicator.react';
import { colorIsDark } from '../../squad-utils';
import fetchJSON from '../../fetch-json';

type Props = {
  entryInfo: HistoryEntryInfo,
  squadInfo: SquadInfo,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  sessionID: string,
  onClick: (event: SyntheticEvent) => Promise<void>,
  restoreEntryInfo: (entryInfo: EntryInfo) => Promise<void>,
  baseURL: string,
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

  render() {
    let deleted = null;
    if (this.state.deleted) {
      deleted = (
        <span className="deleted-entry">
          <span className="deleted-entry-label">deleted</span>
          <span className="restore-entry-label">
            (<a
              href="#"
              className="restore-entry-button"
              onClick={this.onRestore.bind(this)}
            >restore</a>)
          </span>
          <LoadingIndicator
            status={this.state.restoreLoadingStatus}
            baseURL={this.props.baseURL}
            className="restore-loading"
          />
        </span>
      );
    }

    const textClasses = classNames({
      "entry": true,
      "entry-history-entry": true,
      "dark-entry": colorIsDark(this.props.squadInfo.color),
    });
    const textStyle = { backgroundColor: "#" + this.props.squadInfo.color };
    const creator = this.props.entryInfo.creator === null
      ? "Anonymous"
      : <span className="entry-username">{this.props.entryInfo.creator}</span>;

    return (
      <li>
        <div className={textClasses} style={textStyle}>
          {this.props.entryInfo.text}
        </div>
        <span className="entry-author">
          {"created by "}
          {creator}
        </span>
        <span className="entry-squad">
          {this.props.squadInfo.name}
        </span>
        <div className="clear" />
        {deleted}
        <a
          href="#"
          className="revision-history-button"
          onClick={this.props.onClick}
        >revision history &gt;</a>
        <div className="clear" />
      </li>
    );
  }

  async onRestore() {
    this.setState({ restoreLoadingStatus: "loading" });
    const response = await fetchJSON(this.props.baseURL, 'restore_entry.php', {
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
      squadID: this.props.entryInfo.squadID,
      text: response.text,
      year: this.props.year,
      month: this.props.month,
      day: this.props.day,
      creationTime: response.creation_time,
    });
  }

}

HistoryEntry.propTypes = {
  entryInfo: historyEntryInfoPropType,
  squadInfo: squadInfoPropType,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  onClick: React.PropTypes.func.isRequired,
  restoreEntryInfo: React.PropTypes.func.isRequired,
  baseURL: React.PropTypes.string.isRequired,
}

type OwnProps = {
  entryInfo: HistoryEntryInfo,
};
const mapStateToProps = (state: AppState, ownProps: OwnProps) => {
  return {
    squadInfo: state.squadInfos[ownProps.entryInfo.squadID],
    sessionID: state.sessionID,
    baseURL: state.baseURL,
  };
};
export default connect(mapStateToProps)(HistoryEntry);
