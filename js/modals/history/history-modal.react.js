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
import type { AppState, UpdateStore } from '../../redux-reducer';

import React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import _ from 'lodash';

import Modal from '../modal.react';
import fetchJSON from '../../fetch-json';
import LoadingIndicator from '../../loading-indicator.react';
import HistoryEntry from './history-entry.react';
import HistoryRevision from './history-revision.react';
import { getDate } from '../../date-utils';
import { mapStateToUpdateStore } from '../../redux-utils';
import { currentNavID } from '../../nav-utils';

type Props = {
  mode: HistoryMode,
  baseURL: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  currentNavID: string,
  onClose: () => void,
  currentEntryID?: ?string,
  updateStore: UpdateStore,
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
          onClick={this.onClickAllEntries.bind(this)}
          className="all-history-button"
        >
          &lt; all entries
        </a>
      );
    }
    const historyDate = getDate(
      this.props.year,
      this.props.month,
      this.props.day,
    );
    const prettyDate = dateFormat(historyDate, "mmmm dS, yyyy");
    const loadingStatus = this.state.mode === "day"
      ? this.state.dayLoadingStatus
      : this.state.entryLoadingStatus;

    const entries = this.state.entries.map((entryInfo) =>
      <HistoryEntry
        entryInfo={entryInfo}
        year={this.props.year}
        month={this.props.month}
        day={this.props.day}
        onClick={(event) => this.onClickEntry(entryInfo.id)}
        restoreEntryInfo={this.restoreEntryInfo.bind(this)}
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
    const response = await fetchJSON(this.props.baseURL, 'day_history.php', {
      'day': this.props.day,
      'month': this.props.month,
      'year': this.props.year,
      'nav': this.props.currentNavID,
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
    const response = await fetchJSON(this.props.baseURL, 'entry_history.php', {
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

    this.props.updateStore((prevState: AppState) => {
      const dayString = entryInfo.day.toString();
      const saveObj = {};
      saveObj[dayString] = {};
      saveObj[dayString][id] = { $set: entryInfo };
      return update(prevState, { entryInfos: saveObj });
    });

    await this.loadEntry(id);
  }

}

HistoryModal.propTypes = {
  mode: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  currentNavID: React.PropTypes.string.isRequired,
  onClose: React.PropTypes.func.isRequired,
  currentEntryID: React.PropTypes.string,
  updateStore: React.PropTypes.func.isRequired,
};

HistoryModal.defaultProps = {
  currentEntryID: null,
};

export default connect(
  (state: AppState) => ({
    currentNavID: currentNavID(state),
    baseURL: state.navInfo.baseURL,
  }),
  mapStateToUpdateStore,
)(HistoryModal);
