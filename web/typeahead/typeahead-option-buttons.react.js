// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType, threadPermissions } from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { CalendarResult } from 'lib/actions/entry-actions';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';

import PropTypes from 'prop-types';

import React from 'react';
import { connect } from 'react-redux';

import {
  currentNavID,
  currentCalendarQuery,
} from 'lib/selectors/nav-selectors';
import {
  fetchEntriesActionTypes,
  fetchEntries,
} from 'lib/actions/entry-actions';
import {
  subscribeActionTypes,
  subscribe,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';

import css from '../style.css';
import LoadingIndicator from '../loading-indicator.react';
import ThreadSettingsModal from '../modals/thread-settings-modal.react';

type Props = {
  threadInfo: ThreadInfo,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  focusTypeahead: () => void,
  // Redux state
  home: bool,
  currentNavID: ?string,
  loadingStatus: LoadingStatus,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  subscribe: (
    threadID: string,
    newSubscribed: bool,
  ) => Promise<void>,
  fetchEntries: (calendarQuery: CalendarQuery) => Promise<CalendarResult>,
};
type State = {
};

class TypeaheadOptionButtons extends React.PureComponent {

  props: Props;
  state: State;

  render() {
    const permissions = this.props.threadInfo.currentUserRole.permissions;
    if (!permissions[threadPermissions.VISIBLE]) {
      return (
        <ul className={css['thread-nav-option-buttons']}>
          <li>Closed</li>
        </ul>
      );
    }
    let editButton = null;
    if (permissions[threadPermissions.EDIT_THREAD] && this.props.currentNavID) {
      editButton = (
        <li>
          <a href='#' onClick={this.edit}>
            Settings
          </a>
        </li>
      );
    }
    const subcribeButtonText = this.props.threadInfo.currentUserRole.subscribed
      ? 'Unsubscribe'
      : 'Subscribe';
    return (
      <ul className={css['thread-nav-option-buttons']}>
        {editButton}
        <li>
          <LoadingIndicator
            status={this.props.loadingStatus}
            className={css['thread-nav-option-buttons-loading']}
          />
          <a href='#' onClick={this.onSubscribe}>
            {subcribeButtonText}
          </a>
        </li>
      </ul>
    );
  }

  onSubscribe = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.props.loadingStatus === "loading") {
      return;
    }
    const newSubscribed = !this.props.threadInfo.currentUserRole.subscribed;

    this.props.dispatchActionPromise(
      subscribeActionTypes,
      this.subscribeAction(newSubscribed),
      {
        customKeyName:
          `${subscribeActionTypes.started}:${this.props.threadInfo.id}`,
      },
    );

    // If we are on home and just subscribed to a thread, we need to load it
    if (this.props.home && newSubscribed) {
      this.props.dispatchActionPromise(
        fetchEntriesActionTypes,
        this.props.fetchEntries({
          ...this.props.currentCalendarQuery(),
          navID: this.props.threadInfo.id,
        }),
      );
    }
  }

  async subscribeAction(newSubscribed: bool) {
    await this.props.subscribe(this.props.threadInfo.id, newSubscribed);
    // If this subscription action causes us to leave the null home state, then
    // we need to make sure that the typeahead is active iff it's focused. The
    // default resolution in Typeahead would be to close the typeahead, but it's
    // more natural to leave the typeahead open in this situation, so we choose
    // to focus the typeahead input field instead.
    if (!this.props.currentNavID && this.props.home && newSubscribed) {
      this.props.focusTypeahead();
    }
    return {
      threadID: this.props.threadInfo.id,
      newSubscribed,
    };
  }

  edit = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.props.freezeTypeahead(this.props.threadInfo.id);
    const onClose = () => {
      this.props.unfreezeTypeahead(this.props.threadInfo.id);
      this.props.clearModal();
    }
    this.props.setModal(
      <ThreadSettingsModal
        threadInfo={this.props.threadInfo}
        onClose={onClose}
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
  currentCalendarQuery: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  subscribe: PropTypes.func.isRequired,
  fetchEntries: PropTypes.func.isRequired,
};

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => ({
    home: state.navInfo.home,
    currentNavID: currentNavID(state),
    loadingStatus: createLoadingStatusSelector(
      subscribeActionTypes,
      `${subscribeActionTypes.started}:${ownProps.threadInfo.id}`,
    )(state),
    currentCalendarQuery: currentCalendarQuery(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ subscribe, fetchEntries }),
)(TypeaheadOptionButtons);
