// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _filter from 'lodash/fp/filter.js';
import _flow from 'lodash/fp/flow.js';
import _map from 'lodash/fp/map.js';
import _unionBy from 'lodash/fp/unionBy.js';
import * as React from 'react';

import {
  fetchEntriesActionTypes,
  fetchEntries,
  fetchRevisionsForEntryActionTypes,
  fetchRevisionsForEntry,
} from 'lib/actions/entry-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { nonExcludeDeletedCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  EntryInfo,
  CalendarQuery,
  FetchEntryInfosResult,
} from 'lib/types/entry-types.js';
import { type CalendarFilter } from 'lib/types/filter-types.js';
import type {
  HistoryMode,
  HistoryRevisionInfo,
} from 'lib/types/history-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { prettyDateWithoutDay } from 'lib/utils/date-utils.js';

import HistoryEntry from './history-entry.react.js';
import HistoryRevision from './history-revision.react.js';
import css from './history.css';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { allDaysToEntries } from '../../selectors/entry-selectors.js';
import Modal from '../modal.react.js';

type BaseProps = {
  +mode: HistoryMode,
  +dayString: string,
  +currentEntryID?: ?string,
};
type Props = {
  ...BaseProps,
  +entryInfos: ?(EntryInfo[]),
  +dayLoadingStatus: LoadingStatus,
  +entryLoadingStatus: LoadingStatus,
  +calendarFilters: $ReadOnlyArray<CalendarFilter>,
  +dispatchActionPromise: DispatchActionPromise,
  +fetchEntries: (
    calendarQuery: CalendarQuery,
  ) => Promise<FetchEntryInfosResult>,
  +fetchRevisionsForEntry: (
    entryID: string,
  ) => Promise<$ReadOnlyArray<HistoryRevisionInfo>>,
  +onClose: () => void,
};
type State = {
  +mode: HistoryMode,
  +animateModeChange: boolean,
  +currentEntryID: ?string,
  +revisions: $ReadOnlyArray<HistoryRevisionInfo>,
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
    const prettyDate = prettyDateWithoutDay(this.props.dayString);
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
      revisionInfo => revisionInfo.entryID === this.state.currentEntryID,
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
    this.setState(prevState => {
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

const dayLoadingStatusSelector = createLoadingStatusSelector(
  fetchEntriesActionTypes,
);
const entryLoadingStatusSelector = createLoadingStatusSelector(
  fetchRevisionsForEntryActionTypes,
);

const ConnectedHistoryModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedHistoryModal(props) {
    const entryInfos = useSelector(
      state => allDaysToEntries(state)[props.dayString],
    );
    const dayLoadingStatus = useSelector(dayLoadingStatusSelector);
    const entryLoadingStatus = useSelector(entryLoadingStatusSelector);
    const calendarFilters = useSelector(
      nonExcludeDeletedCalendarFiltersSelector,
    );
    const callFetchEntries = useServerCall(fetchEntries);
    const callFetchRevisionsForEntry = useServerCall(fetchRevisionsForEntry);
    const dispatchActionPromise = useDispatchActionPromise();
    const modalContext = useModalContext();

    return (
      <HistoryModal
        {...props}
        entryInfos={entryInfos}
        dayLoadingStatus={dayLoadingStatus}
        entryLoadingStatus={entryLoadingStatus}
        calendarFilters={calendarFilters}
        fetchEntries={callFetchEntries}
        fetchRevisionsForEntry={callFetchRevisionsForEntry}
        dispatchActionPromise={dispatchActionPromise}
        onClose={modalContext.popModal}
      />
    );
  });

export default ConnectedHistoryModal;
