// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { EntryInfo } from 'lib/types/entry-types';

import React from 'react';
import { connect } from 'react-redux';

import { currentNavID } from 'lib/selectors/nav-selectors';
import {
  fetchEntriesForMonthActionType,
  fetchEntriesForMonth,
} from 'lib/actions/entry-actions';
import {
  subscribeActionType,
  subscribe,
} from 'lib/actions/calendar-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  createBoundServerCallSelector,
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
  year: number,
  month: number,
  home: bool,
  currentNavID: ?string,
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  subscribe: (
    calendarID: string,
    newSubscribed: bool,
  ) => Promise<void>,
  fetchEntriesForMonth: (
    year: number,
    month: number,
    navID: string,
  ) => Promise<EntryInfo[]>,
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
        fetchEntriesForMonthActionType,
        this.props.fetchEntriesForMonth(
          this.props.year,
          this.props.month,
          this.props.calendarInfo.id,
        ),
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
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  focusTypeahead: React.PropTypes.func.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  home: React.PropTypes.bool.isRequired,
  currentNavID: React.PropTypes.string,
  loadingStatus: React.PropTypes.string.isRequired,
  dispatchActionPromise: React.PropTypes.func.isRequired,
  subscribe: React.PropTypes.func.isRequired,
  fetchEntriesForMonth: React.PropTypes.func.isRequired,
};

const fetchEntriesForMonthServerCallSelector
  = createBoundServerCallSelector(fetchEntriesForMonth);
const subscribeServerCallSelector = createBoundServerCallSelector(subscribe);

export default connect(
  (state: AppState, ownProps: { calendarInfo: CalendarInfo }) => ({
    year: state.navInfo.year,
    month: state.navInfo.month,
    home: state.navInfo.home,
    currentNavID: currentNavID(state),
    loadingStatus: createLoadingStatusSelector(
      subscribeActionType,
      `${subscribeActionType}:${ownProps.calendarInfo.id}`,
    )(state),
    subscribe: subscribeServerCallSelector(state),
    fetchEntriesForMonth: fetchEntriesForMonthServerCallSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(TypeaheadOptionButtons);
