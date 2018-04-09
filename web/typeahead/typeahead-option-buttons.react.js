// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type LeaveThreadPayload,
  type ThreadJoinPayload,
  threadTypes,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { CalendarQuery, CalendarResult } from 'lib/types/entry-types';

import PropTypes from 'prop-types';

import * as React from 'react';

import {
  currentNavID,
  currentCalendarQuery,
} from 'lib/selectors/nav-selectors';
import {
  fetchEntriesActionTypes,
  fetchEntries,
} from 'lib/actions/entry-actions';
import {
  joinThreadActionTypes,
  joinThread,
  leaveThreadActionTypes,
  leaveThread,
} from 'lib/actions/thread-actions';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors';

import css from '../style.css';
import LoadingIndicator from '../loading-indicator.react';
import ThreadSettingsModal from '../modals/threads/thread-settings-modal.react';
import ConfirmLeaveThreadModal
  from '../modals/threads/confirm-leave-thread-modal.react';
import CantLeaveThreadModal
  from '../modals/threads/cant-leave-thread-modal.react';

type Props = {
  threadInfo: ThreadInfo,
  setModal: (modal: React.Node) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  focusTypeahead: () => void,
  // Redux state
  home: bool,
  currentNavID: ?string,
  loadingStatus: LoadingStatus,
  otherUsersButNoOtherAdmins: bool,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  joinThread: (
    threadID: string,
    threadPassword?: string,
  ) => Promise<ThreadJoinPayload>,
  leaveThread: (threadID: string) => Promise<LeaveThreadPayload>,
  fetchEntries: (calendarQuery: CalendarQuery) => Promise<CalendarResult>,
};

class TypeaheadOptionButtons extends React.PureComponent<Props> {

  render() {
    // We show "Closed" if the viewer is not a member, and either they don't
    // have permission to join the thread, or they are password-protected
    // threadTypes.CLOSED threads.
    const isMember = viewerIsMember(this.props.threadInfo);
    const showClosed =
      !isMember && (
        this.props.threadInfo.type === threadTypes.CLOSED ||
        !threadHasPermission(
          this.props.threadInfo,
          threadPermissions.JOIN_THREAD,
        )
      );
    if (showClosed) {
      return (
        <ul className={css['thread-nav-option-buttons']}>
          <li>Closed</li>
        </ul>
      );
    }
    const canEditThread = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_THREAD,
    );
    let editButton = null;
    if (canEditThread && this.props.currentNavID) {
      editButton = (
        <li>
          <a href='#' onClick={this.edit}>
            Settings
          </a>
        </li>
      );
    }
    const buttonText = isMember ? 'Leave' : 'Join';
    const buttonAction = isMember ? this.onLeave : this.onJoin;
    return (
      <ul className={css['thread-nav-option-buttons']}>
        {editButton}
        <li>
          <LoadingIndicator
            status={this.props.loadingStatus}
            className={css['thread-nav-option-buttons-loading']}
          />
          <a href='#' onClick={buttonAction}>{buttonText}</a>
        </li>
      </ul>
    );
  }

  onJoin = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.props.loadingStatus === "loading") {
      return;
    }

    this.props.dispatchActionPromise(
      joinThreadActionTypes,
      this.joinAction(),
      {
        customKeyName:
          `${joinThreadActionTypes.started}:${this.props.threadInfo.id}`,
      },
    );

    // If we are at home we need to load the new thread
    if (this.props.home) {
      const query = this.props.currentCalendarQuery();
      this.props.dispatchActionPromise(
        fetchEntriesActionTypes,
        this.props.fetchEntries({
          navID: this.props.threadInfo.id,
          startDate: query.startDate,
          endDate: query.endDate,
          includeDeleted: query.includeDeleted,
        }),
      );
    }
  }

  async joinAction() {
    const result = await this.props.joinThread(this.props.threadInfo.id);
    // If this subscription action causes us to leave the null home state, then
    // we need to make sure that the typeahead is active iff it's focused. The
    // default resolution in Typeahead would be to close the typeahead, but it's
    // more natural to leave the typeahead open in this situation, so we choose
    // to focus the typeahead input field instead.
    if (!this.props.currentNavID && this.props.home) {
      this.props.focusTypeahead();
    }
    return result;
  }

  onLeave = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.props.loadingStatus === "loading") {
      return;
    }

    this.props.freezeTypeahead(this.props.threadInfo.id);

    if (this.props.otherUsersButNoOtherAdmins) {
      this.props.setModal(<CantLeaveThreadModal onClose={this.onClose} />);
      return;
    }

    this.props.setModal(
      <ConfirmLeaveThreadModal
        threadInfo={this.props.threadInfo}
        onClose={this.onClose}
        onConfirm={this.onConfirmLeave}
      />
    );
  }

  onClose = () => {
    this.props.unfreezeTypeahead(this.props.threadInfo.id);
    this.props.focusTypeahead();
    this.props.clearModal();
  }

  onConfirmLeave = () => {
    this.onClose();
    this.props.dispatchActionPromise(
      leaveThreadActionTypes,
      this.props.leaveThread(this.props.threadInfo.id),
      {
        customKeyName:
          `${leaveThreadActionTypes.started}:${this.props.threadInfo.id}`,
      },
    );
  }

  edit = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    this.props.freezeTypeahead(this.props.threadInfo.id);
    this.props.setModal(
      <ThreadSettingsModal
        threadInfo={this.props.threadInfo}
        onClose={this.onClose}
      />
    );
  }

}

TypeaheadOptionButtons.propTypes = {
  threadInfo: threadInfoPropType.isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  freezeTypeahead: PropTypes.func.isRequired,
  unfreezeTypeahead: PropTypes.func.isRequired,
  focusTypeahead: PropTypes.func.isRequired,
  home: PropTypes.bool.isRequired,
  currentNavID: PropTypes.string,
  loadingStatus: PropTypes.string.isRequired,
  otherUsersButNoOtherAdmins: PropTypes.bool.isRequired,
  currentCalendarQuery: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  joinThread: PropTypes.func.isRequired,
  leaveThread: PropTypes.func.isRequired,
  fetchEntries: PropTypes.func.isRequired,
};

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => ({
    home: state.navInfo.home,
    currentNavID: currentNavID(state),
    loadingStatus: combineLoadingStatuses(
      createLoadingStatusSelector(
        joinThreadActionTypes,
        `${joinThreadActionTypes.started}:${ownProps.threadInfo.id}`,
      )(state),
      createLoadingStatusSelector(
        leaveThreadActionTypes,
        `${leaveThreadActionTypes.started}:${ownProps.threadInfo.id}`,
      )(state),
    ),
    otherUsersButNoOtherAdmins:
      otherUsersButNoOtherAdmins(ownProps.threadInfo.id)(state),
    currentCalendarQuery: currentCalendarQuery(state),
  }),
  { joinThread, leaveThread, fetchEntries },
)(TypeaheadOptionButtons);
