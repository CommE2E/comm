// @flow

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
  entryInfo: EntryInfo,
  squadInfo: SquadInfo,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  sessionID: string,
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
        <span className="entry-calendar">
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
      squadID: this.props.entryInfo.squadID,
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
  squadInfo: squadInfoPropType,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  onClick: React.PropTypes.func.isRequired,
  restoreEntryInfo: React.PropTypes.func.isRequired,
}

type OwnProps = { entryInfo: EntryInfo };
export default connect((state: AppState, ownProps: OwnProps) => ({
  squadInfo: state.squadInfos[ownProps.entryInfo.squadID],
  sessionID: state.sessionID,
}))(HistoryEntry);
