// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import {
  restoreEntryActionTypes,
  restoreEntry,
} from 'lib/actions/entry-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import {
  type EntryInfo,
  type RestoreEntryInfo,
  type RestoreEntryResult,
  type CalendarQuery,
} from 'lib/types/entry-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';
import type { UserInfo } from 'lib/types/user-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './history.css';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../../selectors/nav-selectors.js';

type BaseProps = {
  +entryInfo: EntryInfo,
  +onClick: (entryID: string) => void,
  +animateAndLoadEntry: (entryID: string) => void,
};
type Props = {
  ...BaseProps,
  +threadInfo: ResolvedThreadInfo,
  +loggedIn: boolean,
  +restoreLoadingStatus: LoadingStatus,
  +calendarQuery: () => CalendarQuery,
  +dispatchActionPromise: DispatchActionPromise,
  +restoreEntry: (info: RestoreEntryInfo) => Promise<RestoreEntryResult>,
  +creator: ?UserInfo,
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
    const creator = this.props.creator?.username ? (
      <span className={css.entryUsername}>{this.props.creator.username}</span>
    ) : (
      'anonymous'
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

const ConnectedHistoryEntry: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedHistoryEntry(props) {
    const entryID = props.entryInfo.id;
    invariant(entryID, 'entryInfo.id (serverID) should be set');
    const unresolvedThreadInfo = useSelector(
      state => threadInfoSelector(state)[props.entryInfo.threadID],
    );
    const threadInfo = useResolvedThreadInfo(unresolvedThreadInfo);
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
    const calenderQuery = useSelector(nonThreadCalendarQuery);
    const callRestoreEntry = useServerCall(restoreEntry);
    const dispatchActionPromise = useDispatchActionPromise();

    const { creator } = props.entryInfo;
    const [creatorWithENSName] = useENSNames([creator]);

    return (
      <HistoryEntry
        {...props}
        threadInfo={threadInfo}
        loggedIn={loggedIn}
        restoreLoadingStatus={restoreLoadingStatus}
        calendarQuery={calenderQuery}
        dispatchActionPromise={dispatchActionPromise}
        restoreEntry={callRestoreEntry}
        creator={creatorWithENSName}
      />
    );
  });

export default ConnectedHistoryEntry;
