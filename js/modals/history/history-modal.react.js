// @flow

import type { LoadingStatus } from '../../loading-indicator.react';
import type {
  HistoryMode,
  HistoryEntryInfo,
  HistoryRevisionInfo,
} from './history-types';
import type { SquadInfo } from '../../squad-info';
import { squadInfoPropType } from '../../squad-info';
import type { EntryInfo } from '../../calendar/entry-info';

import React from 'react';
import invariant from 'invariant';
import $ from 'jquery';
import 'jquery-dateformat'; // side effect: $.format
import classNames from 'classnames';

import Modal from '../modal.react';
import fetchJSON from '../../fetch-json';
import LoadingIndicator from '../../loading-indicator.react';
import HistoryEntry from './history-entry.react';
import HistoryRevision from './history-revision.react';

type Props = {
  mode: HistoryMode,
  baseURL: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  sessionID: string,
  navID: string,
  squadInfos: {[id: string]: SquadInfo},
  onClose: () => void,
  restoreEntryInfo: (entryInfo: EntryInfo) => Promise<void>,
  currentEntryID?: ?string,
};
type State = {
  mode: HistoryMode,
  animateModeChange: bool,
  dayLoadingStatus: LoadingStatus,
  entries: HistoryEntryInfo[],
  entryLoadingStatus: LoadingStatus,
  currentEntryID: ?string,
  revisions: HistoryRevisionInfo[],
};

class HistoryModal extends React.Component {

  static defaultProps: { currentEntryID: ?string };
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    if (props.mode === "entry") {
      invariant(props.currentEntryID, "entry ID should be set");
    }
    this.state = {
      mode: props.mode,
      animateModeChange: false,
      dayLoadingStatus: "loading",
      entries: [],
      entryLoadingStatus: "loading",
      currentEntryID: props.currentEntryID,
      revisions: [],
    };
  }

  componentDidMount() {
    const promises = [this.loadDay()];
    if (this.state.mode === "entry") {
      invariant(this.state.currentEntryID, "entry ID should be set");
      promises.push(this.loadEntry(this.state.currentEntryID));
    }
    Promise.all(promises).then();
  }

  render() {
    let allHistoryButton = null;
    if (this.state.mode === 'entry') {
      allHistoryButton = (
        <a
          href="#"
          id="all-history-button"
          onClick={this.onClickAllEntries.bind(this)}
        >&lt; all entries</a>
      );
    }
    const historyDate = new Date(
      this.props.year,
      this.props.month - 1,
      this.props.day,
    );
    const prettyDate = $.format.date(historyDate, "MMMM D, yyyy");
    const loadingStatus = this.state.mode === "day"
      ? this.state.dayLoadingStatus
      : this.state.entryLoadingStatus;

    const entries = this.state.entries.map((entryInfo) =>
      <HistoryEntry
        entryInfo={entryInfo}
        squadInfo={this.props.squadInfos[entryInfo.squadID]}
        year={this.props.year}
        month={this.props.month}
        day={this.props.day}
        sessionID={this.props.sessionID}
        onClick={(event) => this.onClickEntry(entryInfo.id)}
        restoreEntryInfo={this.restoreEntryInfo.bind(this)}
        baseURL={this.props.baseURL}
        key={entryInfo.id}
      />
    );
    const revisions = [];
    for (let i = 0; i < this.state.revisions.length; i++) {
      const revisionInfo = this.state.revisions[i];
      const nextRevisionInfo = this.state.revisions[i + 1];
      const isDeletionOrRestoration = nextRevisionInfo !== undefined &&
        revisionInfo.deleted !== nextRevisionInfo.deleted;
      revisions.push(
        <HistoryRevision
          revisionInfo={revisionInfo}
          squadInfo={this.props.squadInfos[revisionInfo.squadID]}
          isDeletionOrRestoration={isDeletionOrRestoration}
          key={revisionInfo.id}
        />
      );
    }

    const animate = this.state.animateModeChange;
    const dayMode = this.state.mode === "day";
    const dayClasses = classNames({
      "day-history": true,
      "day-history-visible": dayMode && !animate,
      "day-history-invisible": !dayMode && !animate,
      "day-history-visible-animate": dayMode && animate,
      "day-history-invisible-animate": !dayMode && animate,
    });
    const entryMode = this.state.mode === "entry";
    const entryClasses = classNames({
      "entry-history": true,
      "entry-history-visible": entryMode && !animate,
      "entry-history-invisible": !entryMode && !animate,
      "entry-history-visible-animate": entryMode && animate,
      "entry-history-invisible-animate": !entryMode && animate,
    });

    return (
      <Modal name="History" onClose={this.props.onClose}>
        <div className="modal-body history-modal-body">
          <div className="history-header">
            {allHistoryButton}
            <span className="history-date">{prettyDate}</span>
            <LoadingIndicator
              status={loadingStatus}
              baseURL={this.props.baseURL}
              className="history-loading"
            />
          </div>
          <div className={dayClasses}><ul>{entries}</ul></div>
          <div className={entryClasses}><ul>{revisions}</ul></div>
        </div>
      </Modal>
    );
  }

  async loadDay() {
    this.setState({
      dayLoadingStatus: "loading",
      entries: [],
    });
    const response = await fetchJSON('day_history.php', {
      'day': this.props.day,
      'month': this.props.month,
      'year': this.props.year,
      'nav': this.props.navID,
    });
    if (!response.result) {
      this.setState({ dayLoadingStatus: "error" });
      return;
    }
    this.setState({
      dayLoadingStatus: "inactive",
      entries: response.result,
    });
  }

  async loadEntry(entryID: string) {
    this.setState({
      entryLoadingStatus: "loading",
      revisions: [],
    });
    const response = await fetchJSON('entry_history.php', {
      'id': entryID,
    });
    if (!response.result) {
      this.setState({ entryLoadingStatus: "error" });
      return;
    }
    this.setState({
      entryLoadingStatus: "inactive",
      revisions: response.result,
    });
  }

  async onClickEntry(entryID: string) {
    if (this.state.currentEntryID === entryID) {
      this.setState({
        mode: "entry",
        animateModeChange: true,
      });
      return;
    }
    this.setState({
      mode: "entry",
      animateModeChange: true,
      currentEntryID: entryID,
    });
    await this.loadEntry(entryID);
  }

  onClickAllEntries(event: SyntheticEvent) {
    this.setState({
      mode: "day",
      animateModeChange: true,
    });
  }

  async restoreEntryInfo(entryInfo: EntryInfo) {
    const id = entryInfo.id;
    invariant(id, "entry should have ID");
    this.setState({
      mode: "entry",
      animateModeChange: true,
      currentEntryID: id,
    });
    await Promise.all([
      this.loadEntry(id),
      this.props.restoreEntryInfo(entryInfo),
    ]);
  }

}

HistoryModal.propTypes = {
  mode: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  navID: React.PropTypes.string.isRequired,
  squadInfos: React.PropTypes.objectOf(squadInfoPropType).isRequired,
  onClose: React.PropTypes.func.isRequired,
  restoreEntryInfo: React.PropTypes.func.isRequired,
  currentEntryID: React.PropTypes.string,
};

HistoryModal.defaultProps = {
  currentEntryID: null,
};

export default HistoryModal;
