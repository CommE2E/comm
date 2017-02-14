// @flow

import type { HistoryMode, HistoryRevisionInfo } from 'lib/types/history-types';
import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../../redux-setup';

import React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import _ from 'lodash';

import { getDate } from 'lib/utils/date-utils';
import { currentNavID } from 'lib/selectors/nav-selectors';
import {
  fetchAllEntriesForDayActionType,
  fetchAllEntriesForDay,
  fetchRevisionsForEntryActionType,
  fetchRevisionsForEntry,
} from 'lib/actions/entry-actions';
import { entryKey } from 'lib/shared/entry-utils';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { includeDispatchActionProps } from 'lib/utils/action-utils';

import css from '../../style.css';
import Modal from '../modal.react';
import LoadingIndicator from '../../loading-indicator.react';
import HistoryEntry from './history-entry.react';
import HistoryRevision from './history-revision.react';
import { currentMonthDaysToEntries } from '../../selectors/calendar-selectors';

type Props = {
  mode: HistoryMode,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  currentNavID: ?string,
  entryInfos: ?EntryInfo[],
  onClose: () => void,
  currentEntryID?: ?string,
  dayLoadingStatus: LoadingStatus,
  entryLoadingStatus: LoadingStatus,
  dispatchActionPromise: DispatchActionPromise,
};
type State = {
  mode: HistoryMode,
  animateModeChange: bool,
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
    this.state = {
      mode: props.mode,
      animateModeChange: false,
      currentEntryID: props.currentEntryID,
      revisions: [],
    };
  }

  componentDidMount() {
    this.loadDay();
    if (this.state.mode === "entry") {
      invariant(this.state.currentEntryID, "entry ID should be set");
      this.loadEntry(this.state.currentEntryID);
    }
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
    const loadingStatus = this.state.mode === "day"
      ? this.props.dayLoadingStatus
      : this.props.entryLoadingStatus;

    const entries = _.chain(this.props.entryInfos)
      .filter((entryInfo: EntryInfo) => entryInfo.id)
      .map((entryInfo: EntryInfo) => {
        const serverID = entryInfo.id;
        invariant(serverID, "serverID should be set");
        return (
          <HistoryEntry
            entryInfo={entryInfo}
            year={this.props.year}
            month={this.props.month}
            day={this.props.day}
            onClick={(event) => this.onClickEntry(event, serverID)}
            animateAndLoadEntry={this.animateAndLoadEntry.bind(this)}
            key={serverID}
          />
        );
      }).value();

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

  loadDay() {
    invariant(
      this.props.currentNavID,
      "currentNavID should be set before history-modal opened",
    );
    this.props.dispatchActionPromise(
      fetchAllEntriesForDayActionType,
      fetchAllEntriesForDay(
        this.props.year,
        this.props.month,
        this.props.day,
        this.props.currentNavID,
      ),
    );
  }

  loadEntry(entryID: string) {
    this.setState({ mode: "entry", currentEntryID: entryID });
    this.props.dispatchActionPromise(
      fetchRevisionsForEntryActionType,
      this.fetchRevisionsForEntryAction(entryID),
    );
  }

  async fetchRevisionsForEntryAction(entryID: string) {
    const response = await fetchRevisionsForEntry(entryID);
    this.setState((prevState, props) => {
      // This merge here will preserve time ordering correctly
      const revisions = _.unionBy(response.result, prevState.revisions, "id");
      return { ...prevState, revisions };
    });
    return {
      entryID,
      text: response.result[0].text,
      deleted: response.result[0].deleted,
    };
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

  animateAndLoadEntry(entryID: string) {
    this.setState({ animateModeChange: true });
    this.loadEntry(entryID);
  }

}

HistoryModal.propTypes = {
  mode: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  currentNavID: React.PropTypes.string,
  entryInfos: React.PropTypes.arrayOf(entryInfoPropType),
  dayLoadingStatus: React.PropTypes.string.isRequired,
  entryLoadingStatus: React.PropTypes.string.isRequired,
  onClose: React.PropTypes.func.isRequired,
  currentEntryID: React.PropTypes.string,
  dispatchActionPromise: React.PropTypes.func.isRequired,
};

const dayLoadingStatusSelector
  = createLoadingStatusSelector(fetchAllEntriesForDayActionType);
const entryLoadingStatusSelector
  = createLoadingStatusSelector(fetchRevisionsForEntryActionType);

export default connect(
  (state: AppState, ownProps: { day: number }) => ({
    currentNavID: currentNavID(state),
    entryInfos: currentMonthDaysToEntries(state)[ownProps.day],
    dayLoadingStatus: dayLoadingStatusSelector(state),
    entryLoadingStatus: entryLoadingStatusSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(HistoryModal);
