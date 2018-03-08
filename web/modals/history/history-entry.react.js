// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import {
  type EntryInfo,
  entryInfoPropType,
  type RestoreEntryResponse,
} from 'lib/types/entry-types';
import type { AppState } from '../../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { CurrentUserInfo } from 'lib/types/user-types';

import * as React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { colorIsDark } from 'lib/shared/thread-utils';
import {
  restoreEntryActionTypes,
  restoreEntry,
} from 'lib/actions/entry-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';
import {
  currentSessionID,
  sessionStartingPayload,
} from 'lib/selectors/session-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import css from '../../style.css';
import LoadingIndicator from '../../loading-indicator.react';

type Props = {
  entryInfo: EntryInfo,
  onClick: (entryID: string) => void,
  animateAndLoadEntry: (entryID: string) => void,
  // Redux state
  threadInfo: ThreadInfo,
  sessionID: () => string,
  loggedIn: bool,
  restoreLoadingStatus: LoadingStatus,
  sessionStartingPayload: () => { newSessionID?: string },
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  restoreEntry: (
    entryID: string,
    sessionID: string,
  ) => Promise<RestoreEntryResponse>,
};

class HistoryEntry extends React.PureComponent<Props> {

  render() {
    let deleted = null;
    if (this.props.entryInfo.deleted) {
      let restore = null;
      if (this.props.loggedIn) {
        restore = (
          <span>
            <span className={css['restore-entry-label']}>
              (<a
                href="#"
                onClick={this.onRestore}
              >restore</a>)
            </span>
            <LoadingIndicator
              status={this.props.restoreLoadingStatus}
              className={css['restore-loading']}
            />
          </span>
        );
      }
      deleted = (
        <span className={css['deleted-entry']}>
          <span className={css['deleted-entry-label']}>deleted</span>
          {restore}
        </span>
      );
    }

    const textClasses = classNames({
      [css['entry']]: true,
      [css['entry-history-entry']]: true,
      [css['dark-entry']]: colorIsDark(this.props.threadInfo.color),
    });
    const textStyle = { backgroundColor: "#" + this.props.threadInfo.color };
    const creator = this.props.entryInfo.creator === null
      ? "Anonymous"
      : <span className={css['entry-username']}>
          {this.props.entryInfo.creator}
        </span>;

    return (
      <li>
        <div className={textClasses} style={textStyle}>
          {this.props.entryInfo.text}
        </div>
        <span className={css['entry-author']}>
          {"created by "}
          {creator}
        </span>
        <span className={css['entry-thread']}>
          {this.props.threadInfo.uiName}
        </span>
        <div className={css['clear']} />
        {deleted}
        <a
          href="#"
          className={css['revision-history-button']}
          onClick={this.onClick}
        >revision history &gt;</a>
        <div className={css['clear']} />
      </li>
    );
  }

  onRestore = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entryInfo.id (serverID) should be set");
    const startingPayload = this.props.sessionStartingPayload();
    this.props.dispatchActionPromise(
      restoreEntryActionTypes,
      this.restoreEntryAction(),
      { customKeyName: `${restoreEntryActionTypes.started}:${entryID}` },
      startingPayload,
    );
  }

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entryInfo.id (serverID) should be set");
    this.props.onClick(entryID);
  }

  async restoreEntryAction() {
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entry should have ID");
    const result = await this.props.restoreEntry(
      entryID,
      this.props.sessionID(),
    );
    this.props.animateAndLoadEntry(entryID);
    return result;
  }

}

HistoryEntry.propTypes = {
  entryInfo: entryInfoPropType,
  onClick: PropTypes.func.isRequired,
  animateAndLoadEntry: PropTypes.func.isRequired,
  threadInfo: threadInfoPropType,
  sessionID: PropTypes.func.isRequired,
  loggedIn: PropTypes.bool.isRequired,
  restoreLoadingStatus: PropTypes.string.isRequired,
  sessionStartingPayload: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  restoreEntry: PropTypes.func.isRequired,
}

export default connect(
  (state: AppState, ownProps: { entryInfo: EntryInfo }) => {
    const entryID = ownProps.entryInfo.id;
    invariant(entryID, "entryInfo.id (serverID) should be set");
    return {
      threadInfo: threadInfoSelector(state)[ownProps.entryInfo.threadID],
      sessionID: currentSessionID(state),
      loggedIn: !!(state.currentUserInfo &&
        !state.currentUserInfo.anonymous && true),
      restoreLoadingStatus: createLoadingStatusSelector(
        restoreEntryActionTypes,
        `${restoreEntryActionTypes.started}:${entryID}`,
      )(state),
      sessionStartingPayload: sessionStartingPayload(state),
    };
  },
  { restoreEntry },
)(HistoryEntry);
