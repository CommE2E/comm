// @flow

import classNames from 'classnames';
import dateFormat from 'dateformat';
import invariant from 'invariant';
import {
  fetchEntriesActionTypes,
  fetchEntries,
  fetchRevisionsForEntryActionTypes,
  fetchRevisionsForEntry,
} from 'lib/actions/entry-actions';
import { nonExcludeDeletedCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type {
  EntryInfo,
  CalendarQuery,
  FetchEntryInfosResult,
} from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import {
  type CalendarFilter,
  calendarFilterPropType,
} from 'lib/types/filter-types';
import type { HistoryMode, HistoryRevisionInfo } from 'lib/types/history-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import { dateFromString } from 'lib/utils/date-utils';
import { connect } from 'lib/utils/redux-utils';
import _filter from 'lodash/fp/filter';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _unionBy from 'lodash/fp/unionBy';
import PropTypes from 'prop-types';
import * as React from 'react';

import LoadingIndicator from '../../loading-indicator.react';
import type { AppState } from '../../redux/redux-setup';
import { allDaysToEntries } from '../../selectors/entry-selectors';
import Modal from '../modal.react';

import HistoryEntry from './history-entry.react';
import HistoryRevision from './history-revision.react';
import css from './history.css';

type Props = {
  mode: HistoryMode,
  dayString: string,
  onClose: () => void,
  currentEntryID?: ?string,
  // Redux state
  entryInfos: ?(EntryInfo[]),
  dayLoadingStatus: LoadingStatus,
  entryLoadingStatus: LoadingStatus,
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  fetchEntries: (
    calendarQuery: CalendarQuery,
  ) => Promise<FetchEntryInfosResult>,
  fetchRevisionsForEntry: (entryID: string) => Promise<HistoryRevisionInfo[]>,
};
type State = {
  mode: HistoryMode,
  animateModeChange: boolean,
  currentEntryID: ?string,
  revisions: HistoryRevisionInfo[],
};

class HistoryModal extends React.PureComponent<Props, State> {
  static defaultProps = { currentEntryID: null };

  constructor(props: Props) {
    super(props);
    this.state = {
      mode: props.mode,
      animateModeChange: false,
      currentEntryID: props.currentEntryID,
      revisions: [],
    };
  }

  componentDidMount() {
    this.loadDay();
    if (this.state.mode === 'entry') {
      invariant(this.state.currentEntryID, 'entry ID should be set');
      this.loadEntry(this.state.currentEntryID);
    }
  }

  render() {
    let allHistoryButton = null;
    if (this.state.mode === 'entry') {
      allHistoryButton = (
        <a
          href="#"
          onClick={this.onClickAllEntries}
          className={css.allHistoryButton}
        >
          &lt; all entries
        </a>
      );
    }
    const historyDate = dateFromString(this.props.dayString);
    const prettyDate = dateFormat(historyDate, 'mmmm dS, yyyy');
    const loadingStatus =
      this.state.mode === 'day'
        ? this.props.dayLoadingStatus
        : this.props.entryLoadingStatus;

    let entries;
    const entryInfos = this.props.entryInfos;
    if (entryInfos) {
      entries = _flow(
        _filter((entryInfo: EntryInfo) => entryInfo.id),
        _map((entryInfo: EntryInfo) => {
          const serverID = entryInfo.id;
          invariant(serverID, 'serverID should be set');
          return (
            <HistoryEntry
              entryInfo={entryInfo}
              onClick={this.onClickEntry}
              animateAndLoadEntry={this.animateAndLoadEntry}
              key={serverID}
            />
          );
        }),
      )(entryInfos);
    } else {
      entries = [];
    }

    const revisionInfos = this.state.revisions.filter(
      (revisionInfo) => revisionInfo.entryID === this.state.currentEntryID,
    );
    const revisions = [];
    for (let i = 0; i < revisionInfos.length; i++) {
      const revisionInfo = revisionInfos[i];
      const nextRevisionInfo = revisionInfos[i + 1];
      const isDeletionOrRestoration =
        nextRevisionInfo !== undefined &&
        revisionInfo.deleted !== nextRevisionInfo.deleted;
      revisions.push(
        <HistoryRevision
          revisionInfo={revisionInfo}
          isDeletionOrRestoration={isDeletionOrRestoration}
          key={revisionInfo.id}
        />,
      );
    }

    const animate = this.state.animateModeChange;
    const dayMode = this.state.mode === 'day';
    const dayClasses = classNames({
      [css.dayHistory]: true,
      [css.dayHistoryVisible]: dayMode && !animate,
      [css.dayHistoryInvisible]: !dayMode && !animate,
      [css.dayHistoryVisibleAnimate]: dayMode && animate,
      [css.dayHistoryInvisibleAnimate]: !dayMode && animate,
    });
    const entryMode = this.state.mode === 'entry';
    const entryClasses = classNames({
      [css.entryHistory]: true,
      [css.entryHistoryVisible]: entryMode && !animate,
      [css.entryHistoryInvisible]: !entryMode && !animate,
      [css.entryHistoryVisibleAnimate]: entryMode && animate,
      [css.entryHistoryInvisibleAnimate]: !entryMode && animate,
    });

    return (
      <Modal name="History" onClose={this.props.onClose}>
        <div className={css.modalBody}>
          <div className={css.header}>
            {allHistoryButton}
            <span className={css.date}>{prettyDate}</span>
            <LoadingIndicator
              status={loadingStatus}
              color="black"
              loadingClassName={css.loading}
              errorClassName={css.error}
            />
          </div>
          <div className={dayClasses}>
            <ul>{entries}</ul>
          </div>
          <div className={entryClasses}>
            <ul>{revisions}</ul>
          </div>
        </div>
      </Modal>
    );
  }

  loadDay() {
    this.props.dispatchActionPromise(
      fetchEntriesActionTypes,
      this.props.fetchEntries({
        startDate: this.props.dayString,
        endDate: this.props.dayString,
        filters: this.props.calendarFilters,
      }),
    );
  }

  loadEntry(entryID: string) {
    this.setState({ mode: 'entry', currentEntryID: entryID });
    this.props.dispatchActionPromise(
      fetchRevisionsForEntryActionTypes,
      this.fetchRevisionsForEntryAction(entryID),
    );
  }

  async fetchRevisionsForEntryAction(entryID: string) {
    const result = await this.props.fetchRevisionsForEntry(entryID);
    this.setState((prevState) => {
      // This merge here will preserve time ordering correctly
      const revisions = _unionBy('id')(result)(prevState.revisions);
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
  };

  onClickAllEntries = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState({
      mode: 'day',
      animateModeChange: true,
    });
  };

  animateAndLoadEntry = (entryID: string) => {
    this.setState({ animateModeChange: true });
    this.loadEntry(entryID);
  };
}

HistoryModal.propTypes = {
  mode: PropTypes.string.isRequired,
  dayString: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  currentEntryID: PropTypes.string,
  entryInfos: PropTypes.arrayOf(entryInfoPropType),
  dayLoadingStatus: PropTypes.string.isRequired,
  entryLoadingStatus: PropTypes.string.isRequired,
  calendarFilters: PropTypes.arrayOf(calendarFilterPropType).isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  fetchEntries: PropTypes.func.isRequired,
  fetchRevisionsForEntry: PropTypes.func.isRequired,
};

const dayLoadingStatusSelector = createLoadingStatusSelector(
  fetchEntriesActionTypes,
);
const entryLoadingStatusSelector = createLoadingStatusSelector(
  fetchRevisionsForEntryActionTypes,
);

type OwnProps = { dayString: string };
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    entryInfos: allDaysToEntries(state)[ownProps.dayString],
    dayLoadingStatus: dayLoadingStatusSelector(state),
    entryLoadingStatus: entryLoadingStatusSelector(state),
    calendarFilters: nonExcludeDeletedCalendarFiltersSelector(state),
  }),
  { fetchEntries, fetchRevisionsForEntry },
)(HistoryModal);
