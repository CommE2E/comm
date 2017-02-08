// @flow

import type { HistoryMode, HistoryRevisionInfo } from 'lib/model/history-types';
import type { CalendarInfo } from 'lib/model/calendar-info';
import { calendarInfoPropType } from 'lib/model/calendar-info';
import type { EntryInfo } from 'lib/model/entry-info';
import { entryInfoPropType } from 'lib/model/entry-info';
import type { UpdateStore, LoadingStatus } from 'lib/model/redux-reducer';
import type { AppState } from '../../redux-setup';

import React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import _ from 'lodash';

import fetchJSON from 'lib/utils/fetch-json';
import { getDate } from 'lib/utils/date-utils';
import { mapStateToUpdateStore } from 'lib/shared/redux-utils';
import { currentNavID, mergeNewEntriesIntoStore } from 'lib/shared/nav-utils';
import { onScreenCalendarInfos } from 'lib/shared/calendar-utils';
import { entryKey } from 'lib/shared/entry-utils';

import css from '../../style.css';
import Modal from '../modal.react';
import LoadingIndicator from '../../loading-indicator.react';
import HistoryEntry from './history-entry.react';
import HistoryRevision from './history-revision.react';

type Props = {
  mode: HistoryMode,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  currentNavID: ?string,
  onScreenCalendarInfos: CalendarInfo[],
  entryInfos: {[id: string]: EntryInfo},
  onClose: () => void,
  currentEntryID?: ?string,
  updateStore: UpdateStore<AppState>,
};
type State = {
  mode: HistoryMode,
  animateModeChange: bool,
  dayLoadingStatus: LoadingStatus,
  entryLoadingStatuses: {[entryID: string]: LoadingStatus},
  currentEntryID: ?string,
  revisions: HistoryRevisionInfo[],
};

class HistoryModal extends React.Component {

  static defaultProps = { currentEntryID: null };
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    invariant(
      props.currentNavID,
      "currentNavID should be set before history-modal opened",
    );
    const entryLoadingStatuses = {};
    if (props.mode === "entry") {
      invariant(props.currentEntryID, "entry ID should be set");
      entryLoadingStatuses[props.currentEntryID] = "loading";
    }
    this.state = {
      mode: props.mode,
      animateModeChange: false,
      dayLoadingStatus: "loading",
      entryLoadingStatuses: entryLoadingStatuses,
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

  componentWillReceiveProps(newProps: Props) {
    if (!newProps.currentNavID) {
      newProps.onClose();
    }
  }

  render() {
    let allHistoryButton = null;
    if (this.state.mode === 'entry') {
      allHistoryButton = (
        <a
          href="#"
          onClick={this.onClickAllEntries.bind(this)}
          className={css['all-history-button']}
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
    let loadingStatus;
    if (this.state.mode === "day") {
      loadingStatus = this.state.dayLoadingStatus;
    } else {
      invariant(this.state.currentEntryID, "entry ID should be set");
      loadingStatus =
        this.state.entryLoadingStatuses[this.state.currentEntryID];
    }

    const entries = _.chain(this.props.entryInfos)
      .filter(
        (entryInfo) => entryInfo.year === this.props.year &&
          entryInfo.month === this.props.month && entryInfo.id &&
          _.some(this.props.onScreenCalendarInfos, ['id', entryInfo.calendarID])
      ).sortBy("creationTime")
      .map((entryInfo) =>
        <HistoryEntry
          entryInfo={entryInfo}
          year={this.props.year}
          month={this.props.month}
          day={this.props.day}
          onClick={(event) => this.onClickEntry(event, entryInfo.id)}
          restoreEntryInfo={this.restoreEntryInfo.bind(this)}
          key={entryInfo.id}
        />
      ).value();

    const revisionInfos = this.state.revisions.filter(
      (revisionInfo) => revisionInfo.entryID === this.state.currentEntryID
    );
    const revisions = [];
    for (let i = 0; i < revisionInfos.length; i++) {
      const revisionInfo = revisionInfos[i];
      const nextRevisionInfo = revisionInfos[i + 1];
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
      [css['day-history']]: true,
      [css['day-history-visible']]: dayMode && !animate,
      [css['day-history-invisible']]: !dayMode && !animate,
      [css['day-history-visible-animate']]: dayMode && animate,
      [css['day-history-invisible-animate']]: !dayMode && animate,
    });
    const entryMode = this.state.mode === "entry";
    const entryClasses = classNames({
      [css['entry-history']]: true,
      [css['entry-history-visible']]: entryMode && !animate,
      [css['entry-history-invisible']]: !entryMode && !animate,
      [css['entry-history-visible-animate']]: entryMode && animate,
      [css['entry-history-invisible-animate']]: !entryMode && animate,
    });

    return (
      <Modal name="History" onClose={this.props.onClose}>
        <div className={`${css['modal-body']} ${css['history-modal-body']}`}>
          <div className={css['history-header']}>
            {allHistoryButton}
            <span className={css['history-date']}>{prettyDate}</span>
            <LoadingIndicator
              status={loadingStatus}
              className={css['history-loading']}
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
    });
    invariant(
      this.props.currentNavID,
      "currentNavID should be set before history-modal opened",
    );
    const response = await fetchJSON('day_history.php', {
      'day': this.props.day,
      'month': this.props.month,
      'year': this.props.year,
      'nav': this.props.currentNavID,
    });
    if (!response.result) {
      this.setState({ dayLoadingStatus: "error" });
      return;
    }
    mergeNewEntriesIntoStore(this.props.updateStore, response.result);
    this.setState({ dayLoadingStatus: "inactive" });
  }

  async loadEntry(entryID: string) {
    this.setState((prevState, props) => {
      const statusUpdateObj = {};
      statusUpdateObj[entryID] = { $set: "loading" };
      return update(prevState, {
        mode: { $set: "entry" },
        currentEntryID: { $set: entryID },
        entryLoadingStatuses: statusUpdateObj,
      });
    });
    const response = await fetchJSON('entry_history.php', {
      'id': entryID,
    });
    if (!response.result) {
      this.setState((prevState, props) => {
        const updateObj = {};
        updateObj[entryID] = { $set: "error" };
        return update(prevState, { entryLoadingStatuses: updateObj });
      });
      return;
    }
    this.setState((prevState, props) => {
      const updateObj = {};
      // This merge here will preserve time ordering correctly
      const revisions = _.unionBy(response.result, prevState.revisions, "id");
      updateObj["revisions"] = { $set: revisions };
      updateObj["entryLoadingStatuses"] = {};
      updateObj["entryLoadingStatuses"][entryID] = { $set: "inactive" };
      return update(prevState, updateObj);
    });
    this.props.updateStore((prevState: AppState) => {
      const dayString = this.props.day.toString();
      const saveObj = {};
      saveObj[dayString] = {};
      saveObj[dayString][entryID] = {
        text: { $set: response.result[0].text },
        deleted: { $set: response.result[0].deleted },
      };
      return update(prevState, { entryInfos: saveObj });
    });
  }

  async onClickEntry(event: SyntheticEvent, entryID: string) {
    event.preventDefault();
    this.setState({
      animateModeChange: true,
    });
    await this.loadEntry(entryID);
  }

  onClickAllEntries(event: SyntheticEvent) {
    event.preventDefault();
    this.setState({
      mode: "day",
      animateModeChange: true,
    });
  }

  async restoreEntryInfo(entryInfo: EntryInfo) {
    this.setState({
      animateModeChange: true,
    });

    const id = entryInfo.id;
    invariant(id, "entry should have ID");
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
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  currentNavID: React.PropTypes.string,
  onScreenCalendarInfos:
    React.PropTypes.arrayOf(calendarInfoPropType).isRequired,
  entryInfos: React.PropTypes.objectOf(entryInfoPropType).isRequired,
  onClose: React.PropTypes.func.isRequired,
  currentEntryID: React.PropTypes.string,
  updateStore: React.PropTypes.func.isRequired,
};

type OwnProps = { day: number };
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    currentNavID: currentNavID(state),
    onScreenCalendarInfos: onScreenCalendarInfos(state),
    entryInfos: state.entryInfos[ownProps.day.toString()],
  }),
  mapStateToUpdateStore,
)(HistoryModal);
