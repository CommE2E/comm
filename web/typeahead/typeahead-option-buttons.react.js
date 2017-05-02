// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
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
  fetchEntriesActionType,
  fetchEntries,
} from 'lib/actions/entry-actions';
import {
  subscribeActionType,
  subscribe,
} from 'lib/actions/calendar-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';

import css from '../style.css';
import LoadingIndicator from '../loading-indicator.react';
import CalendarSettingsModal from '../modals/calendar-settings-modal.react';

type Props = {
  calendarInfo: CalendarInfo,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  focusTypeahead: () => void,
  // Redux state
  home: bool,
  currentNavID: ?string,
  loadingStatus: LoadingStatus,
  currentCalendarQuery: CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  subscribe: (
    calendarID: string,
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
    if (!this.props.calendarInfo.authorized) {
      return (
        <ul className={css['calendar-nav-option-buttons']}>
          <li>Closed</li>
        </ul>
      );
    }
    let editButton = null;
    if (this.props.calendarInfo.canChangeSettings && this.props.currentNavID) {
      editButton = (
        <li>
          <a href='#' onClick={this.edit}>
            Settings
          </a>
        </li>
      );
    }
    return (
      <ul className={css['calendar-nav-option-buttons']}>
        {editButton}
        <li>
          <LoadingIndicator
            status={this.props.loadingStatus}
            className={css['calendar-nav-option-buttons-loading']}
          />
          <a href='#' onClick={this.onSubscribe}>
            {this.props.calendarInfo.subscribed ? 'Unsubscribe' : 'Subscribe'}
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
    const newSubscribed = !this.props.calendarInfo.subscribed;

    this.props.dispatchActionPromise(
      subscribeActionType,
      this.subscribeAction(newSubscribed),
      { customKeyName: `${subscribeActionType}:${this.props.calendarInfo.id}` },
    );

    // If we are on home and just subscribed to a calendar, we need to load it
    if (this.props.home && newSubscribed) {
      this.props.dispatchActionPromise(
        fetchEntriesActionType,
        this.props.fetchEntries({
          ...this.props.currentCalendarQuery,
          navID: this.props.calendarInfo.id,
        }),
      );
    }
  }

  async subscribeAction(newSubscribed: bool) {
    await this.props.subscribe(this.props.calendarInfo.id, newSubscribed);
    // If this subscription action causes us to leave the null home state, then
    // we need to make sure that the typeahead is active iff it's focused. The
    // default resolution in Typeahead would be to close the typeahead, but it's
    // more natural to leave the typeahead open in this situation, so we choose
    // to focus the typeahead input field instead.
    if (!this.props.currentNavID && this.props.home && newSubscribed) {
      this.props.focusTypeahead();
    }
    return {
      calendarID: this.props.calendarInfo.id,
      newSubscribed,
    };
  }

  edit = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.props.freezeTypeahead(this.props.calendarInfo.id);
    const onClose = () => {
      this.props.unfreezeTypeahead(this.props.calendarInfo.id);
      this.props.clearModal();
    }
    this.props.setModal(
      <CalendarSettingsModal
        calendarInfo={this.props.calendarInfo}
        onClose={onClose}
      />
    );
  }

}

TypeaheadOptionButtons.propTypes = {
  calendarInfo: calendarInfoPropType.isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  freezeTypeahead: PropTypes.func.isRequired,
  unfreezeTypeahead: PropTypes.func.isRequired,
  focusTypeahead: PropTypes.func.isRequired,
  home: PropTypes.bool.isRequired,
  currentNavID: PropTypes.string,
  loadingStatus: PropTypes.string.isRequired,
  currentCalendarQuery: PropTypes.object.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  subscribe: PropTypes.func.isRequired,
  fetchEntries: PropTypes.func.isRequired,
};

export default connect(
  (state: AppState, ownProps: { calendarInfo: CalendarInfo }) => ({
    home: state.navInfo.home,
    currentNavID: currentNavID(state),
    loadingStatus: createLoadingStatusSelector(
      subscribeActionType,
      `${subscribeActionType}:${ownProps.calendarInfo.id}`,
    )(state),
    currentCalendarQuery: currentCalendarQuery(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ subscribe, fetchEntries }),
)(TypeaheadOptionButtons);
