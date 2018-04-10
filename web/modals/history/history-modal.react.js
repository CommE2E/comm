// @flow

import type { HistoryMode, HistoryRevisionInfo } from 'lib/types/history-types';
import type { EntryInfo, CalendarQuery } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../../redux-setup';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import dateFormat from 'dateformat';
import _flow from 'lodash/fp/flow';
import _unionBy from 'lodash/fp/unionBy';
import _map from 'lodash/fp/map';
import _filter from 'lodash/fp/filter';
import PropTypes from 'prop-types';

import { dateFromString } from 'lib/utils/date-utils';
import { currentNavID } from 'lib/selectors/nav-selectors';
import {
  fetchEntriesActionTypes,
  fetchEntries,
  fetchRevisionsForEntryActionTypes,
  fetchRevisionsForEntry,
} from 'lib/actions/entry-actions';
import { entryKey } from 'lib/shared/entry-utils';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';
import { allDaysToEntries } from '../../selectors/entry-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import LoadingIndicator from '../../loading-indicator.react';
import HistoryEntry from './history-entry.react';
import HistoryRevision from './history-revision.react';

type Props = {
  mode: HistoryMode,
  dayString: string,
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
  fetchEntries: (calendarQuery: CalendarQuery) => Promise<EntryInfo[]>,
  fetchRevisionsForEntry: (entryID: string) => Promise<HistoryRevisionInfo[]>,
};
type State = {
  mode: HistoryMode,
  animateModeChange: bool,
  currentEntryID: ?string,
  revisions: HistoryRevisionInfo[],
};

class HistoryModal extends React.PureComponent<Props, State> {

  static defaultProps = { currentEntryID: null };

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
    const historyDate = dateFromString(this.props.dayString);
    const prettyDate = dateFormat(historyDate, "mmmm dS, yyyy");
    const loadingStatus = this.state.mode === "day"
      ? this.props.dayLoadingStatus
      : this.props.entryLoadingStatus;

    let entries;
    const entryInfos = this.props.entryInfos;
    if (entryInfos) {
      entries = _flow(
        _filter((entryInfo: EntryInfo) => entryInfo.id),
        _map((entryInfo: EntryInfo) => {
          const serverID = entryInfo.id;
          invariant(serverID, "serverID should be set");
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
              color="black"
              loadingClassName={css['history-loading']}
              errorClassName={css['history-error']}
            />
          </div>
          <div className={dayClasses}><ul>{entries}</ul></div>
          <div className={entryClasses}><ul>{revisions}</ul></div>
        </div>
      </Modal>
    );
  }

  loadDay() {
    const currentNavID = this.props.currentNavID;
    invariant(
      currentNavID,
      "currentNavID should be set before history-modal opened",
    );
    this.props.dispatchActionPromise(
      fetchEntriesActionTypes,
      this.props.fetchEntries({
        navID: currentNavID,
        startDate: this.props.dayString,
        endDate: this.props.dayString,
        includeDeleted: true,
      }),
    );
  }

  loadEntry(entryID: string) {
    this.setState({ mode: "entry", currentEntryID: entryID });
    this.props.dispatchActionPromise(
      fetchRevisionsForEntryActionTypes,
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

  onClickAllEntries = (event: SyntheticEvent<HTMLAnchorElement>) => {
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
  dayString: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  currentEntryID: PropTypes.string,
  currentNavID: PropTypes.string,
  entryInfos: PropTypes.arrayOf(entryInfoPropType),
  dayLoadingStatus: PropTypes.string.isRequired,
  entryLoadingStatus: PropTypes.string.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  fetchEntries: PropTypes.func.isRequired,
  fetchRevisionsForEntry: PropTypes.func.isRequired,
};

const dayLoadingStatusSelector
  = createLoadingStatusSelector(fetchEntriesActionTypes);
const entryLoadingStatusSelector
  = createLoadingStatusSelector(fetchRevisionsForEntryActionTypes);

type OwnProps = { dayString: string };
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    currentNavID: currentNavID(state),
    entryInfos: allDaysToEntries(state)[ownProps.dayString],
    dayLoadingStatus: dayLoadingStatusSelector(state),
    entryLoadingStatus: entryLoadingStatusSelector(state),
  }),
  { fetchEntries, fetchRevisionsForEntry },
)(HistoryModal);
