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
import _flow from 'lodash/fp/flow';
import _unionBy from 'lodash/fp/unionBy';
import _map from 'lodash/fp/map';
import _filter from 'lodash/fp/filter';
import PropTypes from 'prop-types';

import { getDate, padMonthOrDay } from 'lib/utils/date-utils';
import { currentNavID } from 'lib/selectors/nav-selectors';
import {
  fetchAllEntriesForDayActionType,
  fetchAllEntriesForDay,
  fetchRevisionsForEntryActionType,
  fetchRevisionsForEntry,
} from 'lib/actions/entry-actions';
import { entryKey } from 'lib/shared/entry-utils';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { currentDaysToEntries } from 'lib/selectors/calendar-selectors';

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
  onClose: () => void,
  currentEntryID?: ?string,
  // Redux state
  currentNavID: ?string,
  entryInfos: ?EntryInfo[],
  dayLoadingStatus: LoadingStatus,
  entryLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  fetchAllEntriesForDay: (
    year: number,
    month: number,
    day: number,
    navID: string,
  ) => Promise<EntryInfo[]>,
  fetchRevisionsForEntry: (entryID: string) => Promise<HistoryRevisionInfo[]>,
};
type State = {
  mode: HistoryMode,
  animateModeChange: bool,
  currentEntryID: ?string,
  revisions: HistoryRevisionInfo[],
};

class HistoryModal extends React.PureComponent {

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
          onClick={this.onClickAllEntries}
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

    const entries = _flow(
      _filter((entryInfo: EntryInfo) => entryInfo.id),
      _map((entryInfo: EntryInfo) => {
        const serverID = entryInfo.id;
        invariant(serverID, "serverID should be set");
        return (
          <HistoryEntry
            entryInfo={entryInfo}
            year={this.props.year}
            month={this.props.month}
            day={this.props.day}
            onClick={this.onClickEntry}
            animateAndLoadEntry={this.animateAndLoadEntry}
            key={serverID}
          />
        );
      }),
    )(this.props.entryInfos);

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
      this.props.fetchAllEntriesForDay(
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
    const result = await this.props.fetchRevisionsForEntry(entryID);
    this.setState((prevState, props) => {
      // This merge here will preserve time ordering correctly
      const revisions = _unionBy("id")(result)(prevState.revisions);
      return { ...prevState, revisions };
    });
    return {
      entryID,
      text: result[0].text,
      deleted: result[0].deleted,
    };
  }

  onClickEntry = (entryID: string) => {
    this.setState({ animateModeChange: true });
    this.loadEntry(entryID);
  }

  onClickAllEntries = (event: SyntheticEvent) => {
    event.preventDefault();
    this.setState({
      mode: "day",
      animateModeChange: true,
    });
  }

  animateAndLoadEntry = (entryID: string) => {
    this.setState({ animateModeChange: true });
    this.loadEntry(entryID);
  }

}

HistoryModal.propTypes = {
  mode: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  currentEntryID: PropTypes.string,
  currentNavID: PropTypes.string,
  entryInfos: PropTypes.arrayOf(entryInfoPropType),
  dayLoadingStatus: PropTypes.string.isRequired,
  entryLoadingStatus: PropTypes.string.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  fetchAllEntriesForDay: PropTypes.func.isRequired,
  fetchRevisionsForEntry: PropTypes.func.isRequired,
};

const dayLoadingStatusSelector
  = createLoadingStatusSelector(fetchAllEntriesForDayActionType);
const entryLoadingStatusSelector
  = createLoadingStatusSelector(fetchRevisionsForEntryActionType);

type OwnProps = {
  year: number,
  month: number,
  day: number,
};
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    currentNavID: currentNavID(state),
    entryInfos: currentDaysToEntries(state)
      [`${ownProps.year}-${padMonthOrDay(ownProps.month)}-${ownProps.day}`],
    dayLoadingStatus: dayLoadingStatusSelector(state),
    entryLoadingStatus: entryLoadingStatusSelector(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ fetchAllEntriesForDay, fetchRevisionsForEntry }),
)(HistoryModal);
