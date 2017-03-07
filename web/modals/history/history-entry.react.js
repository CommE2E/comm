// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { AppState } from '../../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';
import invariant from 'invariant';

import { colorIsDark } from 'lib/selectors/calendar-selectors';
import {
  restoreEntryActionType,
  restoreEntry,
} from 'lib/actions/entry-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  createBoundServerCallSelector,
} from 'lib/utils/action-utils';

import css from '../../style.css';
import LoadingIndicator from '../../loading-indicator.react';

type Props = {
  entryInfo: EntryInfo,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  onClick: (entryID: string) => void,
  animateAndLoadEntry: (entryID: string) => void,
  // Redux state
  calendarInfo: CalendarInfo,
  sessionID: string,
  loggedIn: bool,
  restoreLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  restoreEntry: (entryID: string, sessionID: string) => Promise<void>,
};
type State = {
}

class HistoryEntry extends React.PureComponent {

  props: Props;

  render() {
    let deleted = null;
    if (this.props.entryInfo.deleted) {
      let restore = null;
      if (this.props.calendarInfo.editRules < 1 || this.props.loggedIn) {
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
      [css['dark-entry']]: colorIsDark(this.props.calendarInfo.color),
    });
    const textStyle = { backgroundColor: "#" + this.props.calendarInfo.color };
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
        <span className={css['entry-calendar']}>
          {this.props.calendarInfo.name}
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

  onRestore = (event: SyntheticEvent) => {
    event.preventDefault();
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entryInfo.id (serverID) should be set");
    this.props.dispatchActionPromise(
      restoreEntryActionType,
      this.restoreEntryAction(),
      { customKeyName: `${restoreEntryActionType}:${entryID}` },
    );
  }

  onClick = (event: SyntheticEvent) => {
    event.preventDefault();
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entryInfo.id (serverID) should be set");
    this.props.onClick(entryID);
  }

  async restoreEntryAction() {
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entry should have ID");
    await this.props.restoreEntry(entryID, this.props.sessionID);
    this.props.animateAndLoadEntry(entryID);
    return entryID;
  }

}

HistoryEntry.propTypes = {
  entryInfo: entryInfoPropType,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  onClick: React.PropTypes.func.isRequired,
  animateAndLoadEntry: React.PropTypes.func.isRequired,
  calendarInfo: calendarInfoPropType,
  sessionID: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  restoreLoadingStatus: React.PropTypes.string.isRequired,
  dispatchActionPromise: React.PropTypes.func.isRequired,
  restoreEntry: React.PropTypes.func.isRequired,
}

const restoreEntryServerCallSelector
  = createBoundServerCallSelector(restoreEntry);

export default connect(
  (state: AppState, ownProps: { entryInfo: EntryInfo }) => {
    const entryID = ownProps.entryInfo.id;
    invariant(entryID, "entryInfo.id (serverID) should be set");
    return {
      calendarInfo: state.calendarInfos[ownProps.entryInfo.calendarID],
      sessionID: state.sessionID,
      loggedIn: !!state.userInfo,
      restoreLoadingStatus: createLoadingStatusSelector(
        restoreEntryActionType,
        `${restoreEntryActionType}:${entryID}`,
      )(state),
      restoreEntry: restoreEntryServerCallSelector(state),
    };
  },
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(HistoryEntry);
