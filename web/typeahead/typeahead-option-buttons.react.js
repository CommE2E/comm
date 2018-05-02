// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type LeaveThreadPayload,
  type ThreadJoinRequest,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { CalendarQuery } from 'lib/types/entry-types';

import PropTypes from 'prop-types';

import * as React from 'react';

import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
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
  loadingStatus: LoadingStatus,
  otherUsersButNoOtherAdmins: bool,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  joinThread: (request: ThreadJoinRequest) => Promise<ThreadJoinPayload>,
  leaveThread: (threadID: string) => Promise<LeaveThreadPayload>,
};

class TypeaheadOptionButtons extends React.PureComponent<Props> {

  render() {
    // We show "Closed" if the viewer is not a member and they don't have
    // permission to join the thread (hypothetical custom permissions)
    const threadInfo = this.props.threadInfo;
    const isMember = viewerIsMember(threadInfo);
    const showClosed = !isMember && 
      !threadHasPermission(threadInfo, threadPermissions.JOIN_THREAD);
    if (showClosed) {
      return (
        <ul className={css['thread-nav-option-buttons']}>
          <li>Closed</li>
        </ul>
      );
    }
    const canEditThread = threadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD,
    );
    let editButton = null;
    if (canEditThread) {
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
            color="black"
            loadingClassName={css['thread-nav-option-buttons-loading']}
            errorClassName={css['thread-nav-option-buttons-error']}
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
  }

  async joinAction() {
    const query = this.props.currentCalendarQuery();
    return await this.props.joinThread({
      threadID: this.props.threadInfo.id,
      calendarQuery: {
        navID: this.props.threadInfo.id,
        startDate: query.startDate,
        endDate: query.endDate,
        includeDeleted: query.includeDeleted,
      },
    });
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
  loadingStatus: PropTypes.string.isRequired,
  otherUsersButNoOtherAdmins: PropTypes.bool.isRequired,
  currentCalendarQuery: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  joinThread: PropTypes.func.isRequired,
  leaveThread: PropTypes.func.isRequired,
};

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => ({
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
  { joinThread, leaveThread },
)(TypeaheadOptionButtons);
