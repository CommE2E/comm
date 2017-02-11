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
import { includeDispatchActionProps } from 'lib/utils/action-utils';

import css from '../../style.css';
import LoadingIndicator from '../../loading-indicator.react';

type Props = {
  entryInfo: EntryInfo,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  onClick: (event: SyntheticEvent) => void,
  animateAndLoadEntry: (entryID: string) => void,
  calendarInfo: CalendarInfo,
  sessionID: string,
  loggedIn: bool,
  restoreLoadingStatus: LoadingStatus,
  dispatchActionPromise: DispatchActionPromise,
};
type State = {
}

class HistoryEntry extends React.Component {

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
                onClick={this.onRestore.bind(this)}
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
          onClick={this.props.onClick}
        >revision history &gt;</a>
        <div className={css['clear']} />
      </li>
    );
  }

  onRestore(event: SyntheticEvent) {
    event.preventDefault();
    this.props.dispatchActionPromise(
      restoreEntryActionType,
      this.restoreEntryAction(),
    );
  }

  async restoreEntryAction() {
    const entryID = this.props.entryInfo.id;
    invariant(entryID, "entry should have ID");
    await restoreEntry(entryID, this.props.sessionID);
    this.props.animateAndLoadEntry(entryID);
    return { ...this.props.entryInfo, deleted: false };
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
}

const loadingStatusSelector
  = createLoadingStatusSelector(restoreEntryActionType);

export default connect(
  (state: AppState, ownProps: { entryInfo: EntryInfo }) => ({
    calendarInfo: state.calendarInfos[ownProps.entryInfo.calendarID],
    sessionID: state.sessionID,
    loggedIn: !!state.userInfo,
    restoreLoadingStatus: loadingStatusSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(HistoryEntry);
