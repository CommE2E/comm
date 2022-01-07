// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import {
  restoreEntryActionTypes,
  restoreEntry,
} from 'lib/actions/entry-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { colorIsDark } from 'lib/shared/thread-utils';
import { type EntryInfo, type CalendarQuery } from 'lib/types/entry-types';
import {
  type RestoreEntryInfo,
  type RestoreEntryResult,
} from 'lib/types/entry-types-api';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import LoadingIndicator from '../../loading-indicator.react';
import { useSelector } from '../../redux/redux-utils';
import { nonThreadCalendarQuery } from '../../selectors/nav-selectors';
import css from './history.css';

type BaseProps = {
  +entryInfo: EntryInfo,
  +onClick: (entryID: string) => void,
  +animateAndLoadEntry: (entryID: string) => void,
};
type Props = {
  ...BaseProps,
  +threadInfo: ThreadInfo,
  +loggedIn: boolean,
  +restoreLoadingStatus: LoadingStatus,
  +calendarQuery: () => CalendarQuery,
  +dispatchActionPromise: DispatchActionPromise,
  +restoreEntry: (info: RestoreEntryInfo) => Promise<RestoreEntryResult>,
};

class HistoryEntry extends React.PureComponent<Props> {
  render() {
    let deleted = null;
    if (this.props.entryInfo.deleted) {
      let restore = null;
      if (this.props.loggedIn) {
        restore = (
          <span>
            <span className={css.restoreEntryLabel}>
              (
              <a href="#" onClick={this.onRestore}>
                restore
              </a>
              )
            </span>
            <LoadingIndicator
              status={this.props.restoreLoadingStatus}
              color="black"
              loadingClassName={css.restoreLoading}
              errorClassName={css.restoreError}
            />
          </span>
        );
      }
      deleted = (
        <span className={css.deletedEntry}>
          <span className={css.deletedEntryLabel}>deleted</span>
          {restore}
        </span>
      );
    }

    const textClasses = classNames({
      [css.entry]: true,
      [css.darkEntry]: colorIsDark(this.props.threadInfo.color),
    });
    const textStyle = { backgroundColor: '#' + this.props.threadInfo.color };
    const creator =
      this.props.entryInfo.creator === null ? (
        'Anonymous'
      ) : (
        <span className={css.entryUsername}>
          {this.props.entryInfo.creator}
        </span>
      );

    return (
      <li>
        <div className={textClasses} style={textStyle}>
          {this.props.entryInfo.text}
        </div>
        <span className={css.entryAuthor}>
          {'created by '}
          {creator}
        </span>
        <span className={css.entryThread}>{this.props.threadInfo.uiName}</span>
        <div className={css.clear} />
        {deleted}
        <a
          href="#"
          className={css.revisionHistoryButton}
          onClick={this.onClick}
        >
          revision history &gt;
        </a>
        <div className={css.clear} />
      </li>
    );
  }

  onRestore = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const entryID = this.props.entryInfo.id;
    invariant(entryID, 'entryInfo.id (serverID) should be set');
    this.props.dispatchActionPromise(
      restoreEntryActionTypes,
      this.restoreEntryAction(),
      { customKeyName: `${restoreEntryActionTypes.started}:${entryID}` },
    );
  };

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const entryID = this.props.entryInfo.id;
    invariant(entryID, 'entryInfo.id (serverID) should be set');
    this.props.onClick(entryID);
  };

  async restoreEntryAction() {
    const entryID = this.props.entryInfo.id;
    invariant(entryID, 'entry should have ID');
    const result = await this.props.restoreEntry({
      entryID,
      calendarQuery: this.props.calendarQuery(),
    });
    this.props.animateAndLoadEntry(entryID);
    return { ...result, threadID: this.props.threadInfo.id };
  }
}

const ConnectedHistoryEntry: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedHistoryEntry(props) {
    const entryID = props.entryInfo.id;
    invariant(entryID, 'entryInfo.id (serverID) should be set');
    const threadInfo = useSelector(
      state => threadInfoSelector(state)[props.entryInfo.threadID],
    );
    const loggedIn = useSelector(
      state =>
        !!(state.currentUserInfo && !state.currentUserInfo.anonymous && true),
    );
    const restoreLoadingStatus = useSelector(
      createLoadingStatusSelector(
        restoreEntryActionTypes,
        `${restoreEntryActionTypes.started}:${entryID}`,
      ),
    );
    const calanderQuery = useSelector(nonThreadCalendarQuery);
    const callRestoreEntry = useServerCall(restoreEntry);
    const dispatchActionPromise = useDispatchActionPromise();

    return (
      <HistoryEntry
        {...props}
        threadInfo={threadInfo}
        loggedIn={loggedIn}
        restoreLoadingStatus={restoreLoadingStatus}
        calendarQuery={calanderQuery}
        restoreEntry={callRestoreEntry}
        dispatchActionPromise={dispatchActionPromise}
      />
    );
  },
);

export default ConnectedHistoryEntry;
